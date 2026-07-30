"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  Field,
  Label,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";

import { SessionsCalendar } from "@/components/admin/SessionsCalendar";
import type {
  BookingRequest,
  ProjectSession,
  ProjectWorkflowStep,
} from "@/lib/types";
import { PROJECT_PATH_STEPS } from "@/lib/workflow/path";

type BookingRow = BookingRequest & {
  sessionTypeName?: string;
  projectName?: string;
  projectStage?: string;
  projectHref?: string;
  sessionHref?: string;
};

type SessionRow = ProjectSession & {
  projectName?: string;
  projectHref?: string;
};

type ConflictInfo = {
  requestId: string;
  conflicts: { start: string; end: string }[];
};

const BOOKING_TABS = [
  { id: "requests", label: "Requests" },
  { id: "calendar", label: "Calendar" },
  { id: "types", label: "Session types" },
] as const;

type BookingTabId = (typeof BOOKING_TABS)[number]["id"];

function isBookingTab(value: string | null): value is BookingTabId {
  return BOOKING_TABS.some((t) => t.id === value);
}

function BookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const tabParam = searchParams.get("tab");
  const tab: BookingTabId = isBookingTab(tabParam) ? tabParam : "requests";

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [requests, setRequests] = useState<BookingRow[]>([]);
  const [slug, setSlug] = useState("");
  const [gcalConnected, setGcalConnected] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  function setTab(id: string) {
    if (!isBookingTab(id)) return;
    if (id === "types") {
      router.push("/admin/settings/booking#types");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (id === "requests") params.delete("tab");
    else params.set("tab", id);
    const q = params.toString();
    router.replace(q ? `/admin/bookings?${q}` : "/admin/bookings", {
      scroll: false,
    });
  }

  async function load(opts?: { historyOffset?: number; appendHistory?: boolean }) {
    const view = tab === "calendar" ? "calendar" : "requests";
    const params = new URLSearchParams({ view });
    if (view === "requests") {
      params.set("offset", String(opts?.historyOffset ?? 0));
    }
    if (opts?.appendHistory) setHistoryLoadingMore(true);
    const res = await fetch(`/api/bookings/session-types?${params}`);
    if (!res.ok) {
      setHistoryLoadingMore(false);
      push("Could not load bookings", "danger");
      return;
    }
    const data = await res.json();
    if (view === "calendar") {
      setSessions(data.sessions || []);
    } else {
      const next = (data.bookingRequests || []) as BookingRow[];
      if (opts?.appendHistory) {
        const pending = next.filter((r) => r.status === "pending");
        const historyChunk = next.filter((r) => r.status !== "pending");
        setRequests((prev) => {
          const prevPending = prev.filter((r) => r.status === "pending");
          const prevHistory = prev.filter((r) => r.status !== "pending");
          // Prefer fresh pending; append new history rows
          return [...(pending.length ? pending : prevPending), ...prevHistory, ...historyChunk];
        });
      } else {
        setRequests(next);
      }
      setHistoryHasMore(Boolean(data.hasMore));
    }
    setSlug(data.homepageSlug || "");
    setGcalConnected(Boolean(data.gcalConnected));
    setHistoryLoadingMore(false);
  }

  useEffect(() => {
    if (tab === "types") {
      router.replace("/admin/settings/booking#types");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function confirmRequest(id: string, force = false) {
    setBusyId(id);
    const res = await fetch("/api/bookings/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "confirmed", force }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);

    if (res.status === 409 && data.needsForce) {
      setConflict({
        requestId: id,
        conflicts: data.conflicts || [],
      });
      return;
    }

    if (!res.ok) {
      push(data.error || "Could not update request", "danger");
      return;
    }

    setConflict(null);
    if (data.calendarPushFailed) {
      push("Confirmed · calendar not updated", "danger");
    }
    const href = typeof data.projectHref === "string" ? data.projectHref : null;
    const step = data.workflowStep as ProjectWorkflowStep | undefined;
    const stepLabel = PROJECT_PATH_STEPS.find((s) => s.id === step)?.label;
    if (href) {
      if (!data.calendarPushFailed) {
        push(
          stepLabel
            ? `Confirmed · continue with ${stepLabel}`
            : "Booking confirmed",
          "success",
        );
      }
      router.push(href.includes("#") ? href : `${href}#workflow`);
      return;
    }
    if (!data.calendarPushFailed) {
      push("Booking confirmed", "success");
    }
    void load();
  }

  async function submitDecline() {
    if (!declineId) return;
    const reason = declineReason.trim();
    if (!reason) {
      push("Decline reason required", "danger");
      return;
    }
    setBusyId(declineId);
    const res = await fetch("/api/bookings/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: declineId,
        status: "declined",
        declineReason: reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      push(data.error || "Could not update request", "danger");
      return;
    }
    setDeclineId(null);
    setDeclineReason("");
    push("Request declined", "success");
    void load();
  }

  const bookUrl = slug ? `/book/${slug}` : "";
  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");
  const tabs = BOOKING_TABS.map((t) =>
    t.id === "requests" && pending.length > 0
      ? { id: t.id, label: `Requests (${pending.length})` }
      : { id: t.id, label: t.label },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bookings"
        actions={
          <>
            <ButtonLink
              href="/admin/settings/booking"
              tone="ghost"
              className="min-h-11"
            >
              Booking settings
            </ButtonLink>
            {bookUrl ? (
              <a href={bookUrl} target="_blank" rel="noreferrer">
                <Button tone="neutral" className="min-h-11">
                  Open booking form
                </Button>
              </a>
            ) : null}
          </>
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "requests" ? (
        <section className="space-y-4">
          {pending.length === 0 && others.length === 0 ? (
            <EmptyState
              variant="inline"
              title="No requests yet."
              description="Share your booking form when session types are ready."
              className="border-y border-line py-4"
            />
          ) : null}

          {pending.length > 0 ? (
            <ul className="space-y-4">
              {pending.map((r) => (
                <li key={r.id}>
                  <Panel variant="interactive" className="sm:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          Pending inquiry
                        </p>
                        <h3 className="font-display text-2xl">{r.name}</h3>
                        <p className="text-sm text-muted">
                          {r.sessionTypeName} ·{" "}
                          {new Date(r.startsAt).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="break-all text-sm">
                          <a
                            className="inline-flex min-h-11 items-center text-accent no-underline"
                            href={`mailto:${r.email}`}
                          >
                            {r.email}
                          </a>
                          {r.phone ? (
                            <span className="text-muted"> · {r.phone}</span>
                          ) : null}
                        </p>
                        {r.notes ? (
                          <p className="mt-2 text-sm text-muted">{r.notes}</p>
                        ) : null}
                        <p className="mt-3 text-sm">
                          Linked project:{" "}
                          <span className="font-medium">
                            {r.projectName || r.name}
                          </span>{" "}
                          · stage {r.projectStage || "inquiry"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {r.projectHref ? (
                          <Link href={r.projectHref} className="w-full sm:w-auto">
                            <Button className="min-h-11 w-full sm:w-auto">
                              Open inquiry in Projects
                            </Button>
                          </Link>
                        ) : null}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Button
                            tone="neutral"
                            className="min-h-11"
                            pending={busyId === r.id}
                            pendingLabel="Confirming…"
                            onClick={() => void confirmRequest(r.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            tone="ghost"
                            className="min-h-11"
                            disabled={busyId === r.id}
                            onClick={() => {
                              setDeclineId(r.id);
                              setDeclineReason("");
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </li>
              ))}
            </ul>
          ) : pending.length === 0 && others.length > 0 ? (
            <p className="text-sm text-muted">No pending requests.</p>
          ) : null}

          {others.length > 0 ? (
            <div className="space-y-4">
              <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
                {others.map((r) => (
                  <li
                    key={r.id}
                    className="border border-line bg-surface p-4 text-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:py-4"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span>{r.name}</span>
                        <StatusBadge domain="bookingRequest" value={r.status} />
                      </p>
                      <p className="text-muted">
                        {r.sessionTypeName} ·{" "}
                        {new Date(r.startsAt).toLocaleString()}
                      </p>
                      {r.declineReason ? (
                        <p className="mt-1 text-muted">
                          Reason: {r.declineReason}
                        </p>
                      ) : null}
                    </div>
                    {r.projectHref ? (
                      <Link
                        className="mt-2 inline-flex min-h-11 items-center text-sm text-accent no-underline sm:mt-0"
                        href={r.projectHref}
                      >
                        Open project
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
              {historyHasMore ? (
                <Button
                  type="button"
                  tone="neutral"
                  className="min-h-11 w-full sm:w-auto"
                  pending={historyLoadingMore}
                  pendingLabel="Loading…"
                  onClick={() =>
                    void load({
                      historyOffset: others.length,
                      appendHistory: true,
                    })
                  }
                >
                  Load more
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "calendar" ? (
        <SessionsCalendar sessions={sessions} gcalConnected={gcalConnected} />
      ) : null}

      {tab === "types" ? (
        <EmptyState
          variant="centered"
          title="Session types moved"
          description="Manage bookable offerings in Booking settings."
          action={
            <ButtonLink href="/admin/settings/booking#types" tone="accent">
              Booking settings
            </ButtonLink>
          }
        />
      ) : null}

      <Dialog
        open={Boolean(declineId)}
        onClose={() => {
          if (busyId) return;
          setDeclineId(null);
          setDeclineReason("");
        }}
        title="Decline request"
      >
        <div className="space-y-4">
          <Field>
            <Label htmlFor="decline-reason">Reason</Label>
            <Textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              required
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              tone="ghost"
              className="min-h-11"
              disabled={Boolean(busyId)}
              onClick={() => {
                setDeclineId(null);
                setDeclineReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              tone="danger"
              className="min-h-11"
              disabled={Boolean(busyId) || !declineReason.trim()}
              onClick={() => void submitDecline()}
            >
              Decline
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(conflict)}
        onClose={() => {
          if (busyId) return;
          setConflict(null);
        }}
        title="Schedule conflict"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            This time overlaps another session. Confirm anyway to book it.
          </p>
          {conflict?.conflicts?.length ? (
            <ul className="space-y-2 text-sm">
              {conflict.conflicts.map((c, i) => (
                <li key={`${c.start}-${i}`} className="border border-line p-3">
                  {new Date(c.start).toLocaleString()} –{" "}
                  {new Date(c.end).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              tone="ghost"
              className="min-h-11"
              disabled={Boolean(busyId)}
              onClick={() => setConflict(null)}
            >
              Back
            </Button>
            <Button
              className="min-h-11"
              disabled={Boolean(busyId) || !conflict}
              onClick={() =>
                conflict && void confirmRequest(conflict.requestId, true)
              }
            >
              Confirm anyway
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <EmptyState
          variant="loading"
          title="Loading bookings…"
          className="shell-pad py-10"
        />
      }
    >
      <BookingsPageInner />
    </Suspense>
  );
}
