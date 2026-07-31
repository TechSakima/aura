"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Label,
  Select,
  useToast,
} from "@/components/ui";
import { formatStudioDate } from "@/lib/date-format";
import type { DateFormat } from "@/lib/types";

type CalendarOption = { id: string; summary: string; primary?: boolean };

function formatCheckedAt(
  iso: string | null | undefined,
  dateFormat: DateFormat,
  timeZone: string,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = formatStudioDate(d, dateFormat, timeZone);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${date} · ${time}`;
}

function displaySyncError(raw?: string | null): string | null {
  if (!raw) return null;
  if (/oauth is not configured/i.test(raw)) return "Calendar sync unavailable";
  if (/token refresh/i.test(raw)) return "Couldn’t refresh calendar connection";
  if (/freeBusy/i.test(raw)) return "Couldn’t read calendar availability";
  return raw;
}

export function SettingsIntegrations() {
  const { push } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLastSyncAt, setGcalLastSyncAt] = useState<string | null>(null);
  const [gcalLastError, setGcalLastError] = useState<string | null>(null);
  const [gcalCalendars, setGcalCalendars] = useState<CalendarOption[]>([]);
  const [gcalCalendarId, setGcalCalendarId] = useState("primary");
  const [gcalCalendarBusy, setGcalCalendarBusy] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLastCheckedAt, setStripeLastCheckedAt] = useState<string | null>(
    null,
  );
  const [stripeLastError, setStripeLastError] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>("mm/dd/yyyy");
  const [timeZone, setTimeZone] = useState("America/Denver");

  async function load() {
    const studioRes = await fetch("/api/studio");
    if (!studioRes.ok) {
      setLoading(false);
      push("Could not load integrations", "danger");
      return;
    }
    const data = await studioRes.json();
    const studio = data.studio || {};
    setGcalConnected(Boolean(studio.googleCalendarConnected));
    setGcalLastSyncAt(studio.googleCalendarLastSyncAt || null);
    setGcalLastError(studio.googleCalendarLastSyncError || null);
    setGcalCalendarId(studio.googleCalendarId || "primary");
    setDateFormat(studio.dateFormat || "mm/dd/yyyy");
    setTimeZone(studio.timeZone || "America/Denver");

    const gcalReady = Boolean(studio.googleCalendarConnected);
    const [connectPut, healthRes, calendarsRes] = await Promise.all([
      fetch("/api/payments/connect", { method: "PUT" }),
      gcalReady
        ? fetch("/api/integrations/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "health" }),
          })
        : Promise.resolve(null),
      gcalReady
        ? fetch("/api/integrations/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "calendars" }),
          })
        : Promise.resolve(null),
    ]);

    if (connectPut.ok) {
      const c = await connectPut.json().catch(() => ({}));
      setStripeConfigured(true);
      setStripeReady(Boolean(c.onboardingComplete));
      setStripeLastCheckedAt(c.lastCheckedAt || null);
      setStripeLastError(c.lastError || null);
    } else {
      const c = await connectPut.json().catch(() => ({}));
      const getRes = await fetch("/api/payments/connect");
      if (getRes.ok) {
        const g = await getRes.json().catch(() => ({}));
        setStripeConfigured(g.stripeConfigured !== false);
        setStripeReady(Boolean(g.onboardingComplete));
        setStripeLastCheckedAt(g.lastCheckedAt || c.lastCheckedAt || null);
        setStripeLastError(g.lastError || c.lastError || c.error || null);
      } else {
        setStripeConfigured(false);
        setStripeLastError(String(c.error || "Could not check payments"));
      }
    }

    if (healthRes?.ok) {
      const h = await healthRes.json().catch(() => ({}));
      setGcalLastSyncAt(h.lastSyncAt || null);
      setGcalLastError(h.lastSyncError || h.syncError || null);
      if (h.connected === false) setGcalConnected(false);
    }

    if (calendarsRes?.ok) {
      const c = await calendarsRes.json().catch(() => ({}));
      const list = Array.isArray(c.calendars)
        ? (c.calendars as CalendarOption[])
        : [];
      setGcalCalendars(list);
      if (typeof c.selectedId === "string" && c.selectedId) {
        setGcalCalendarId(c.selectedId);
      }
    } else if (!gcalReady) {
      setGcalCalendars([]);
    }

    setLoading(false);
  }

  async function saveCalendarId(nextId: string) {
    setGcalCalendarBusy(true);
    const res = await fetch("/api/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setCalendar", calendarId: nextId }),
    });
    const data = await res.json().catch(() => ({}));
    setGcalCalendarBusy(false);
    if (!res.ok) {
      push(String(data.error || "Could not save calendar"), "danger");
      return;
    }
    setGcalCalendarId(String(data.calendarId || nextId));
    push("Calendar saved", "success");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get("gcal");
    if (gcal === "connected") push("Google Calendar connected", "success");
    else if (gcal === "error") push("Could not connect Google Calendar", "danger");
    if (gcal) {
      router.replace("/admin/settings/integrations");
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function connectGoogle() {
    setBusy(true);
    const res = await fetch("/api/integrations/google", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      push(String(data.error || "Could not connect"), "danger");
      return;
    }
    if (data.authUrl) {
      window.location.href = data.authUrl as string;
      return;
    }
    push("Could not connect", "danger");
  }

  async function disconnectGoogle() {
    setBusy(true);
    const res = await fetch("/api/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not disconnect", "danger");
      return;
    }
    setGcalConnected(false);
    setGcalLastSyncAt(null);
    setGcalLastError(null);
    push("Calendar disconnected", "success");
  }

  async function checkHealth() {
    setChecking(true);
    await load();
    setChecking(false);
    push("Status updated", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading integrations…" />;
  }

  const gcalWhen = formatCheckedAt(gcalLastSyncAt, dateFormat, timeZone);
  const gcalError = displaySyncError(gcalLastError);
  const stripeWhen = formatCheckedAt(
    stripeLastCheckedAt,
    dateFormat,
    timeZone,
  );

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">Integrations</h2>
            <p className="mt-1 text-sm text-muted">
              Calendar sync and card payments.
            </p>
          </div>
          <Button
            type="button"
            tone="ghost"
            className="min-h-11 w-full sm:w-auto"
            disabled={checking || busy}
            onClick={() => void checkHealth()}
          >
            {checking ? "Checking…" : "Check status"}
          </Button>
        </div>

        <div className="space-y-8">
          <Field>
            <Label>Google Calendar</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Badge
                tone={
                  gcalConnected
                    ? gcalError
                      ? "danger"
                      : "success"
                    : "neutral"
                }
              >
                {!gcalConnected
                  ? "Not connected"
                  : gcalError
                    ? "Needs attention"
                    : "Connected"}
              </Badge>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  tone={gcalConnected ? "neutral" : "accent"}
                  className="min-h-11 w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => void connectGoogle()}
                >
                  {gcalConnected ? "Refresh connection" : "Connect calendar"}
                </Button>
                {gcalConnected ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => void disconnectGoogle()}
                  >
                    Disconnect
                  </Button>
                ) : null}
              </div>
            </div>
            {gcalConnected ? (
              <div className="mt-3 space-y-3">
                {gcalCalendars.length > 0 ? (
                  <Field>
                    <Label htmlFor="gcal-calendar">Sync calendar</Label>
                    <Select
                      id="gcal-calendar"
                      className="mt-1 min-h-11"
                      value={gcalCalendarId}
                      disabled={gcalCalendarBusy || busy}
                      onChange={(e) => {
                        const next = e.target.value;
                        setGcalCalendarId(next);
                        void saveCalendarId(next);
                      }}
                    >
                      {gcalCalendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                          {c.primary ? " (primary)" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                <div className="space-y-1 text-xs text-muted">
                  {gcalWhen ? <p>Last sync {gcalWhen}</p> : <p>No sync yet</p>}
                  {gcalError ? (
                    <p className="text-danger">{gcalError}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Field>

          <Field>
            <Label>Card payments</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {!stripeConfigured ? (
                  <Badge tone="neutral">Unavailable</Badge>
                ) : stripeReady && !stripeLastError ? (
                  <Badge tone="success">On</Badge>
                ) : stripeReady && stripeLastError ? (
                  <Badge tone="danger">Needs attention</Badge>
                ) : (
                  <Badge tone="neutral">Not set up</Badge>
                )}
              </div>
              <ButtonLink
                href="/admin/settings/payments"
                tone="ghost"
                className="min-h-11 w-full sm:w-auto"
              >
                Payment settings
              </ButtonLink>
            </div>
            {stripeConfigured ? (
              <div className="mt-3 space-y-1 text-xs text-muted">
                {stripeWhen ? <p>Last checked {stripeWhen}</p> : null}
                {stripeLastError ? (
                  <p className="text-danger">{stripeLastError}</p>
                ) : null}
              </div>
            ) : null}
          </Field>
        </div>
      </Card>
    </div>
  );
}
