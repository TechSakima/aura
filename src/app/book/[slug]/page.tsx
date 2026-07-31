"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { PublicSoftFailureContact } from "@/components/public/PublicSoftFailureContact";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import { InstallHint } from "@/components/pwa/InstallHint";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import { mutateJson } from "@/lib/client/mutation";
import {
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";
import type { SessionType, StudioTheme } from "@/lib/types";


function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timezoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const [studioName, setStudioName] = useState("");
  const [studioTheme, setStudioTheme] = useState<StudioTheme | undefined>();
  const [types, setTypes] = useState<SessionType[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [minStartsAt] = useState(() => toLocalDatetimeValue(new Date()));
  const [tz] = useState(() => timezoneLabel());
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "ok" | "busy" | "past" | "sync_failed" | "error"
  >("idle");

  const selected = types.find((t) => t.id === sessionTypeId);
  const showPrice = selected?.pricingMode === "upfront";
  const fontPreset = studioTheme?.fontPreset;
  const themeStyle = useMemo(() => {
    const preset = resolveStudioThemePreset(studioTheme);
    return studioThemeCssVars(preset, {
      fontPreset,
    }) as CSSProperties;
  }, [studioTheme, fontPreset]);

  useEffect(() => {
    fetch(`/api/public/book/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setStudioName(d.studio.name);
          setStudioTheme(d.studio.theme);
          setTypes(d.sessionTypes || []);
          if (d.sessionTypes?.[0]) setSessionTypeId(d.sessionTypes[0].id);
        }
      })
      .catch(() => setError("Could not load booking form"));
  }, [params.slug]);

  useEffect(() => {
    if (!startsAt || !sessionTypeId) {
      setAvailability("idle");
      return;
    }
    const start = new Date(startsAt);
    if (!Number.isFinite(start.getTime())) {
      setAvailability("error");
      return;
    }
    if (start.getTime() < Date.now() - 60_000) {
      setAvailability("past");
      return;
    }

    let cancelled = false;
    setAvailability("checking");
    const timer = window.setTimeout(() => {
      const q = new URLSearchParams({
        availability: "1",
        sessionTypeId,
        startsAt: start.toISOString(),
      });
      void fetch(`/api/public/book/${params.slug}?${q}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d.available === true) {
            setAvailability("ok");
            return;
          }
          if (d.reason === "busy") setAvailability("busy");
          else if (d.reason === "past") setAvailability("past");
          else if (d.reason === "sync_failed") setAvailability("sync_failed");
          else setAvailability("error");
        })
        .catch(() => {
          if (!cancelled) setAvailability("error");
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [startsAt, sessionTypeId, params.slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError("");
    const start = new Date(startsAt);
    if (!Number.isFinite(start.getTime()) || start.getTime() < Date.now() - 60_000) {
      setError("Choose a time in the future.");
      setAvailability("past");
      return;
    }
    if (availability === "busy") {
      setError("That time is unavailable. Choose another.");
      return;
    }
    if (availability === "sync_failed") {
      setError("Booking is temporarily unavailable. Try again shortly.");
      return;
    }
    setPending(true);
    try {
      const result = await mutateJson<{
        error?: string;
        calendarSyncFailed?: boolean;
      }>(
        `/api/public/book/${params.slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone: phone.trim() || undefined,
            notes: notes.trim() || undefined,
            sessionTypeId,
            startsAt: start.toISOString(),
          }),
        },
        { action: "book" },
      );
      if (!result.ok) {
        setError(result.errorMessage);
        if (result.data?.calendarSyncFailed) setAvailability("sync_failed");
        else if (result.status === 409) setAvailability("busy");
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (error && !studioName && types.length === 0) {
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <p className="py-16 text-center text-muted">{error}</p>
      </PublicShell>
    );
  }

  if (done) {
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <PublicSuccess title="Request received">
          <p>We’ll confirm your session shortly.</p>
        </PublicSuccess>
      </PublicShell>
    );
  }

  if (studioName && types.length === 0) {
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
          <StudioMark name={studioName} tone="dark" className="mb-2" />
          <h1 className="font-display text-3xl sm:text-4xl">{studioName}</h1>
          <p className="mt-4 text-muted">Booking is not open yet.</p>
          <PublicSoftFailureContact
            studioName={studioName}
            source="booking"
            slug={params.slug}
            context="Booking not open"
          />
        </div>
      </PublicShell>
    );
  }

  const availabilityHint =
    availability === "checking"
      ? "Checking availability…"
      : availability === "ok"
        ? "That time looks open."
        : availability === "busy"
          ? "That time is unavailable."
          : availability === "past"
            ? "Choose a time in the future."
            : availability === "sync_failed"
              ? "Availability check unavailable. Try again shortly."
              : availability === "error"
                ? "Could not check that time."
                : null;

  const slug = params.slug;
  const installKey = slug
    ? `aura-install-dismiss-book-${slug}`
    : "aura-install-dismiss-book";

  return (
    <PublicShell style={themeStyle} fontPreset={fontPreset}>
      <div className="pointer-events-none fixed inset-x-0 z-40 shell-pad bottom-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <InstallHint storageKey={installKey} />
        </div>
      </div>
      <div className="mx-auto max-w-md">
        {studioName ? (
          <StudioMark name={studioName} tone="dark" className="mb-2" />
        ) : null}
        <h1 className="font-display text-3xl sm:text-4xl">
          {studioName || "Book"}
        </h1>
        <p className="mt-2 text-muted">Request a session.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field>
            <Label htmlFor="type">Session type</Label>
            <Select
              id="type"
              value={sessionTypeId}
              onChange={(e) => setSessionTypeId(e.target.value)}
              required
              disabled={pending}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMinutes}m)
                  {t.pricingMode === "upfront" ? ` · $${t.basePrice}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          {showPrice && selected ? (
            <p className="text-sm text-muted">
              From ${selected.basePrice}
              {selected.depositAmount != null
                ? ` · deposit $${selected.depositAmount}`
                : ""}
            </p>
          ) : null}
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="min-h-11"
              disabled={pending}
            />
          </Field>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-11"
              disabled={pending}
            />
          </Field>
          <Field>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-11"
              disabled={pending}
            />
          </Field>
          <Field>
            <Label htmlFor="when">Preferred date & time</Label>
            <Input
              id="when"
              type="datetime-local"
              value={startsAt}
              min={minStartsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="min-h-11"
              disabled={pending}
            />
            {tz ? (
              <p className="mt-1 text-xs text-muted">Times in {tz}</p>
            ) : null}
            {availabilityHint ? (
              <p
                className={
                  availability === "busy" ||
                  availability === "past" ||
                  availability === "sync_failed" ||
                  availability === "error"
                    ? "mt-1 text-sm text-danger"
                    : "mt-1 text-sm text-muted"
                }
              >
                {availabilityHint}
              </p>
            ) : null}
          </Field>
          <Field>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={pending}
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            type="submit"
            className="min-h-11 w-full"
            pending={pending}
            pendingLabel="Sending…"
            disabled={
              pending ||
              availability === "busy" ||
              availability === "past" ||
              availability === "checking" ||
              availability === "sync_failed"
            }
          >
            Request booking
          </Button>
        </form>
        {availability === "sync_failed" && studioName ? (
          <PublicSoftFailureContact
            studioName={studioName}
            source="booking"
            slug={params.slug}
            context="Booking unavailable"
            className="mt-6"
          />
        ) : null}
      </div>
    </PublicShell>
  );
}
