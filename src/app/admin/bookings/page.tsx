"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { SessionsCalendar } from "@/components/admin/SessionsCalendar";
import type {
  BookingRequest,
  ProjectSession,
  SessionDurationUnit,
  SessionPricingMode,
  SessionType,
} from "@/lib/types";
import { formatSessionDuration, toDurationMinutes } from "@/lib/session-duration";

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

export default function BookingsPage() {
  const { push } = useToast();
  const [types, setTypes] = useState<SessionType[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [requests, setRequests] = useState<BookingRow[]>([]);
  const [slug, setSlug] = useState("");
  const [gcalConnected, setGcalConnected] = useState(false);
  const [name, setName] = useState("Portrait session");
  const [duration, setDuration] = useState("60");
  const [durationUnit, setDurationUnit] =
    useState<SessionDurationUnit>("minutes");
  const [price, setPrice] = useState("250");
  const [pricingMode, setPricingMode] =
    useState<SessionPricingMode>("after_intake");
  const [depositAmount, setDepositAmount] = useState("");
  const [questionnaireTemplateId, setQuestionnaireTemplateId] = useState("");
  const [qTemplates, setQTemplates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [creatingType, setCreatingType] = useState(false);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  async function load() {
    const res = await fetch("/api/bookings/session-types");
    if (!res.ok) {
      push("Could not load bookings", "danger");
      return;
    }
    const data = await res.json();
    setTypes(data.sessionTypes || []);
    setSessions(data.sessions || []);
    setRequests(data.bookingRequests || []);
    setSlug(data.homepageSlug || "");
    setGcalConnected(Boolean(data.gcalConnected));
    setQTemplates(data.questionnaireTemplates || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreatingType(true);
    const res = await fetch("/api/bookings/session-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        durationValue: Number(duration),
        durationUnit,
        basePrice: Number(price),
        pricingMode,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        questionnaireTemplateId: questionnaireTemplateId || undefined,
      }),
    });
    setCreatingType(false);
    if (!res.ok) {
      push("Failed", "danger");
      return;
    }
    push("Session type created", "success");
    setDepositAmount("");
    void load();
  }

  async function updateTypeQuestionnaire(
    id: string,
    nextTemplateId: string,
  ) {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, questionnaireTemplateId: nextTemplateId || undefined }
          : t,
      ),
    );
    setSavingTypeId(id);
    const res = await fetch("/api/bookings/session-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        questionnaireTemplateId: nextTemplateId,
      }),
    });
    setSavingTypeId(null);
    if (!res.ok) {
      push("Could not update session type", "danger");
      void load();
      return;
    }
    push("Session type updated", "success");
  }

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
    push("Booking confirmed", "success");
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

  return (
    <div className="space-y-10">
      <PageHeader
        title="Bookings"
        description="Public booking form creates a Project inquiry. Review requests here, then open the project to quote and prep."
        actions={
          bookUrl ? (
            <a href={bookUrl} target="_blank" rel="noreferrer">
              <Button tone="neutral" className="min-h-11">
                Open booking form
              </Button>
            </a>
          ) : null
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl">Booking requests</h2>
          <p className="mt-1 text-sm text-muted">
            Each request already created a Project. Open the inquiry there to
            continue the workflow.
          </p>
        </div>

        {pending.length === 0 && others.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-muted">
            No requests yet. Share your booking form when session types are ready.
          </p>
        ) : null}

        {pending.length > 0 ? (
          <ul className="space-y-4">
            {pending.map((r) => (
              <li key={r.id} className="border border-line bg-surface p-4 sm:p-5">
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
                      <a className="text-accent" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                      {r.phone ? ` · ${r.phone}` : ""}
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No pending requests.</p>
        )}

        {others.length > 0 ? (
          <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
            {others.map((r) => (
              <li
                key={r.id}
                className="border border-line bg-surface p-4 text-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {r.name} · {r.status}
                  </p>
                  <p className="text-muted">
                    {r.sessionTypeName} ·{" "}
                    {new Date(r.startsAt).toLocaleString()}
                  </p>
                  {r.declineReason ? (
                    <p className="mt-1 text-muted">Reason: {r.declineReason}</p>
                  ) : null}
                </div>
                {r.projectHref ? (
                  <Link className="mt-2 inline-block text-accent sm:mt-0" href={r.projectHref}>
                    Open project
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <SessionsCalendar sessions={sessions} gcalConnected={gcalConnected} />

      <Card className="max-w-lg p-5">
        <h2 className="mb-1 font-display text-2xl">New session type</h2>
        <p className="mb-4 text-sm text-muted">
          Bookable offerings on your public form. Quote packages for project
          pricing stay under Prep.
        </p>
        <form onSubmit={onCreate} className="space-y-4">
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="duration">Duration</Label>
            <div className="flex gap-2">
              <Input
                id="duration"
                type="number"
                min={1}
                step={durationUnit === "minutes" ? 15 : 1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1"
              />
              <Select
                aria-label="Duration unit"
                value={durationUnit}
                onChange={(e) => {
                  const next = e.target.value as SessionDurationUnit;
                  const mins = toDurationMinutes(Number(duration), durationUnit);
                  setDurationUnit(next);
                  if (next === "minutes") setDuration(String(mins));
                  else if (next === "hours")
                    setDuration(String(Math.max(1, Math.round(mins / 60))));
                  else
                    setDuration(
                      String(Math.max(1, Math.round(mins / (60 * 24)))),
                    );
                }}
                className="w-32"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
          </Field>
          <Field>
            <Label htmlFor="price">Base price ($)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="pricingMode">Pricing</Label>
            <Select
              id="pricingMode"
              value={pricingMode}
              onChange={(e) =>
                setPricingMode(e.target.value as SessionPricingMode)
              }
            >
              <option value="after_intake">Quote after intake</option>
              <option value="upfront">Show price on booking form</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="deposit">Deposit ($)</Label>
            <Input
              id="deposit"
              type="number"
              min={0}
              step="1"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field>
            <Label htmlFor="q-tmpl">Questionnaire</Label>
            <Select
              id="q-tmpl"
              value={questionnaireTemplateId}
              onChange={(e) => setQuestionnaireTemplateId(e.target.value)}
            >
              <option value="">None</option>
              {qTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {qTemplates.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                Create templates under Documents.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Sent automatically when you confirm a booking.
              </p>
            )}
          </Field>
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            pending={creatingType}
            pendingLabel="Creating…"
          >
            Create
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-2xl">Session types</h2>
        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
          {types.map((t) => (
            <li
              key={t.id}
              className="border border-line bg-surface p-4 text-sm sm:border-0 sm:bg-transparent sm:p-0 sm:py-3"
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-muted">
                {formatSessionDuration(t.durationMinutes)} · ${t.basePrice}
                {t.pricingMode === "upfront" ? " · upfront" : " · after intake"}
                {t.depositAmount != null ? ` · deposit $${t.depositAmount}` : ""}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:max-w-sm">
                <Label htmlFor={`st-q-${t.id}`}>Questionnaire</Label>
                <Select
                  id={`st-q-${t.id}`}
                  value={t.questionnaireTemplateId || ""}
                  disabled={savingTypeId === t.id}
                  onChange={(e) =>
                    void updateTypeQuestionnaire(t.id, e.target.value)
                  }
                >
                  <option value="">None</option>
                  {qTemplates.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </Select>
              </div>
            </li>
          ))}
          {types.length === 0 ? (
            <li className="py-4 text-sm text-muted">None yet.</li>
          ) : null}
        </ul>
      </section>

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
