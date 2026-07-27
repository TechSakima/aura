"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  PageHeader,
  useToast,
} from "@/components/ui";
import type { BookingRequest, ProjectSession, SessionType } from "@/lib/types";

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

export default function BookingsPage() {
  const { push } = useToast();
  const [types, setTypes] = useState<SessionType[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [requests, setRequests] = useState<BookingRow[]>([]);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("Portrait session");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("250");
  const [busyId, setBusyId] = useState<string | null>(null);

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
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/bookings/session-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        durationMinutes: Number(duration),
        basePrice: Number(price),
      }),
    });
    if (!res.ok) {
      push("Failed", "danger");
      return;
    }
    push("Session type created", "success");
    void load();
  }

  async function setRequestStatus(
    id: string,
    status: "confirmed" | "declined",
  ) {
    setBusyId(id);
    const res = await fetch("/api/bookings/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusyId(null);
    if (!res.ok) {
      push("Could not update request", "danger");
      return;
    }
    push(status === "confirmed" ? "Booking confirmed" : "Request declined", "success");
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
              <Button tone="neutral">Open booking form</Button>
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
              <li key={r.id} className="border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
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
                    <p className="text-sm">
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
                  <div className="flex flex-col gap-2 sm:items-end">
                    {r.projectHref ? (
                      <Link href={r.projectHref}>
                        <Button>Open inquiry in Projects</Button>
                      </Link>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        tone="neutral"
                        disabled={busyId === r.id}
                        onClick={() => void setRequestStatus(r.id, "confirmed")}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        tone="ghost"
                        disabled={busyId === r.id}
                        onClick={() => void setRequestStatus(r.id, "declined")}
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
          <ul className="divide-y divide-line border-y border-line">
            {others.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.name} · {r.status}
                  </p>
                  <p className="text-muted">
                    {r.sessionTypeName} ·{" "}
                    {new Date(r.startsAt).toLocaleString()}
                  </p>
                </div>
                {r.projectHref ? (
                  <Link className="text-accent" href={r.projectHref}>
                    Open project
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Card className="max-w-lg p-5">
        <h2 className="mb-4 font-display text-2xl">New session type</h2>
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
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
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
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-2xl">Session types</h2>
        <ul className="divide-y divide-line border-y border-line">
          {types.map((t) => (
            <li key={t.id} className="py-3 text-sm">
              {t.name} · {t.durationMinutes}m · ${t.basePrice}
            </li>
          ))}
          {types.length === 0 ? (
            <li className="py-4 text-sm text-muted">None yet.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Sessions calendar</h2>
        <ul className="divide-y divide-line border-y border-line">
          {[...sessions]
            .filter((s) => s.startsAt)
            .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
            .map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <span>
                  {s.projectName ? `${s.projectName} · ` : ""}
                  {s.type} ·{" "}
                  {s.startsAt
                    ? new Date(s.startsAt).toLocaleString()
                    : "TBD"}
                </span>
                <span className="flex gap-3">
                  {s.projectHref ? (
                    <Link className="text-accent" href={s.projectHref}>
                      Project
                    </Link>
                  ) : null}
                  <a
                    className="text-accent"
                    href={`/admin/shoots/${s.id}/helper`}
                  >
                    Shoot day
                  </a>
                </span>
              </li>
            ))}
          {sessions.length === 0 ? (
            <li className="py-4 text-sm text-muted">No sessions scheduled.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
