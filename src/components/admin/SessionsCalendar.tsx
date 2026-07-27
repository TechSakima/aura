"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfDay,
} from "date-fns";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ProjectSession } from "@/lib/types";

export type CalendarSession = ProjectSession & {
  projectName?: string;
  projectHref?: string;
};

type ViewMode = "month" | "week" | "day";

function sessionTimeLabel(iso?: string) {
  if (!iso) return "";
  return format(new Date(iso), "h:mm a");
}

function sessionsOnDay(sessions: CalendarSession[], day: Date) {
  return sessions.filter(
    (s) => s.startsAt && isSameDay(new Date(s.startsAt), day),
  );
}

export function SessionsCalendar({
  sessions,
  gcalConnected,
}: {
  sessions: CalendarSession[];
  gcalConnected?: boolean;
}) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<ViewMode>("month");

  const dated = useMemo(
    () => sessions.filter((s) => Boolean(s.startsAt)),
    [sessions],
  );

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    const end = endOfWeek(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const title =
    view === "day"
      ? format(cursor, "EEEE, MMM d, yyyy")
      : view === "week"
        ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
        : format(cursor, "MMMM yyyy");

  function goPrev() {
    if (view === "month") setCursor((d) => addMonths(d, -1));
    else if (view === "week") setCursor((d) => addWeeks(d, -1));
    else setCursor((d) => addDays(d, -1));
  }

  function goNext() {
    if (view === "month") setCursor((d) => addMonths(d, 1));
    else if (view === "week") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addDays(d, 1));
  }

  function EventChip({ s }: { s: CalendarSession }) {
    const href =
      s.projectHref ||
      (s.projectId ? `/admin/projects/${s.projectId}` : undefined);
    const label = `${s.projectName || s.type} · ${sessionTimeLabel(s.startsAt)}`;
    const inner = (
      <span className="block truncate rounded-sm bg-ink px-1.5 py-0.5 text-[10px] leading-tight text-surface sm:text-[11px]">
        {label}
      </span>
    );
    if (!href) return inner;
    return (
      <Link href={href} className="block no-underline hover:opacity-90">
        {inner}
      </Link>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl">Calendar</h2>
          <p className="mt-1 text-sm text-muted">{title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings">
            <Button tone="neutral" className="min-h-11">
              {gcalConnected ? "Calendar sync" : "Connect calendar"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" className="min-h-11" onClick={goPrev}>
            Prev
          </Button>
          <Button
            tone="ghost"
            className="min-h-11"
            onClick={() => setCursor(startOfDay(new Date()))}
          >
            Today
          </Button>
          <Button tone="ghost" className="min-h-11" onClick={goNext}>
            Next
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-1 sm:inline-flex sm:w-auto">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "min-h-11 rounded-sm px-3 text-xs font-medium uppercase tracking-[0.14em]",
                view === mode
                  ? "bg-ink text-surface"
                  : "text-muted hover:text-ink",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div className="overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-1 py-2">
                <span className="sm:hidden">{d.slice(0, 1)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const items = sessionsOnDay(dated, day);
              const inMonth = isSameMonth(day, cursor);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setCursor(day);
                    setView("day");
                  }}
                  className={cn(
                    "min-h-[4.5rem] border-b border-r border-line p-1 text-left align-top sm:min-h-[6.5rem] sm:p-2",
                    !inMonth && "bg-canvas/60 text-muted",
                    isToday(day) && "bg-accent/5",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-accent text-accent-ink",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 2).map((s) => (
                      <EventChip key={s.id} s={s} />
                    ))}
                    {items.length > 2 ? (
                      <p className="text-[10px] text-muted">
                        +{items.length - 2}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="space-y-2 md:hidden">
          {weekDays.map((day) => {
            const items = sessionsOnDay(dated, day);
            return (
              <div
                key={day.toISOString()}
                className="rounded-md border border-line bg-surface p-3"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  {format(day, "EEE MMM d")}
                  {isToday(day) ? " · Today" : ""}
                </p>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No sessions</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((s) => (
                      <li key={s.id}>
                        <EventChip s={s} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="hidden overflow-hidden rounded-md border border-line md:block">
          <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-xs uppercase tracking-[0.14em] text-muted">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="px-2 py-2">
                {format(day, "EEE d")}
              </div>
            ))}
          </div>
          <div className="grid min-h-[18rem] grid-cols-7">
            {weekDays.map((day) => {
              const items = sessionsOnDay(dated, day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-line p-2",
                    isToday(day) && "bg-accent/5",
                  )}
                >
                  <div className="space-y-1">
                    {items.map((s) => (
                      <EventChip key={s.id} s={s} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "day" ? (
        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            {format(cursor, "EEEE, MMMM d")}
          </p>
          {sessionsOnDay(dated, cursor).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No sessions this day.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {sessionsOnDay(dated, cursor).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {s.projectName || "Session"} · {s.type}
                    </p>
                    <p className="text-sm text-muted">
                      {sessionTimeLabel(s.startsAt)}
                      {s.endsAt ? ` – ${sessionTimeLabel(s.endsAt)}` : ""}
                      {" · "}
                      {s.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.projectHref ? (
                      <Link href={s.projectHref}>
                        <Button size="sm" tone="neutral">
                          Project
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/admin/shoots/${s.id}/helper`}>
                      <Button size="sm">Shoot day</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
