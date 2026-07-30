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
import {
  Button,
  ButtonLink,
  Chip,
  type ChipTone,
  Panel,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ProjectSession, SessionStatus } from "@/lib/types";


export type CalendarSession = ProjectSession & {
  projectName?: string;
  projectHref?: string;
};

type ViewMode = "month" | "months" | "week" | "day";

function sessionTimeLabel(iso?: string) {
  if (!iso) return "";
  return format(new Date(iso), "h:mm a");
}

function sessionsOnDay(sessions: CalendarSession[], day: Date) {
  return sessions.filter(
    (s) => s.startsAt && isSameDay(new Date(s.startsAt), day),
  );
}

function MonthGrid({
  month,
  sessions,
  onSelectDay,
}: {
  month: Date;
  sessions: CalendarSession[];
  onSelectDay: (day: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line bg-surface px-3 py-2 text-center text-sm font-medium">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-2">
            <span className="sm:hidden">{d.slice(0, 1)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = sessionsOnDay(sessions, day);
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
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
                  <p className="text-[10px] text-muted">+{items.length - 2}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sessionChipTone(status?: SessionStatus | string): ChipTone {
  if (status === "delivered") return "success";
  if (status === "archived") return "neutral";
  return "accent";
}

function EventChip({ s }: { s: CalendarSession }) {
  const href =
    s.projectHref ||
    (s.projectId ? `/admin/projects/${s.projectId}` : undefined);
  const label = `${s.projectName || s.type} · ${sessionTimeLabel(s.startsAt)}`;
  return (
    <Chip href={href} tone={sessionChipTone(s.status)} className="w-full">
      {label}
    </Chip>
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
    () =>
      sessions.filter(
        (s) => Boolean(s.startsAt) && s.status !== "archived",
      ),
    [sessions],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    const end = endOfWeek(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const multiMonths = useMemo(
    () => [0, 1, 2].map((i) => startOfMonth(addMonths(cursor, i))),
    [cursor],
  );

  const monthJumpOptions = useMemo(() => {
    const base = startOfMonth(cursor);
    return Array.from({ length: 24 }, (_, i) => {
      const d = addMonths(base, i - 6);
      return {
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy"),
        date: d,
      };
    });
  }, [cursor]);

  const title =
    view === "day"
      ? format(cursor, "EEEE, MMM d, yyyy")
      : view === "week"
        ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
        : view === "months"
          ? `${format(multiMonths[0], "MMM yyyy")} – ${format(multiMonths[2], "MMM yyyy")}`
          : format(cursor, "MMMM yyyy");

  function goPrev() {
    if (view === "months") setCursor((d) => addMonths(d, -3));
    else if (view === "month") setCursor((d) => addMonths(d, -1));
    else if (view === "week") setCursor((d) => addWeeks(d, -1));
    else setCursor((d) => addDays(d, -1));
  }

  function goNext() {
    if (view === "months") setCursor((d) => addMonths(d, 3));
    else if (view === "month") setCursor((d) => addMonths(d, 1));
    else if (view === "week") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addDays(d, 1));
  }

  function selectDay(day: Date) {
    setCursor(day);
    setView("day");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl">Calendar</h2>
          <p className="mt-1 text-sm text-muted">{title}</p>
          <p className="mt-1 text-xs text-muted">
            {gcalConnected
              ? "Google Calendar sync on"
              : "Google Calendar not connected"}
          </p>
        </div>
        <ButtonLink
          href="/admin/settings/integrations"
          tone="ghost"
          className="min-h-11 w-full sm:w-auto"
        >
          Manage in Settings
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
          <Select
            aria-label="Jump to month"
            className="min-h-11 w-[10.5rem]"
            value={format(startOfMonth(cursor), "yyyy-MM")}
            onChange={(e) => {
              const match = monthJumpOptions.find(
                (o) => o.value === e.target.value,
              );
              if (match) setCursor(match.date);
            }}
          >
            {monthJumpOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-1 sm:inline-flex sm:w-auto sm:grid-cols-none">
          {(["day", "week", "month", "months"] as ViewMode[]).map((mode) => (
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
              {mode === "months" ? "3 months" : mode}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          month={startOfMonth(cursor)}
          sessions={dated}
          onSelectDay={selectDay}
        />
      ) : null}

      {view === "months" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {multiMonths.map((month) => (
            <MonthGrid
              key={month.toISOString()}
              month={month}
              sessions={dated}
              onSelectDay={selectDay}
            />
          ))}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="space-y-2 md:hidden">
          {weekDays.map((day) => {
            const items = sessionsOnDay(dated, day);
            return (
              <Panel key={day.toISOString()} className="p-3">
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
              </Panel>
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
        <Panel>
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
        </Panel>
      ) : null}
    </section>
  );
}
