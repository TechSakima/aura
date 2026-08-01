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
  EmptyState,
  Panel,
  SegmentedControl,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ProjectSession, SessionStatus } from "@/lib/types";


export type CalendarSession = ProjectSession & {
  projectName?: string;
  projectHref?: string;
};

type ViewMode = "month" | "months" | "week" | "day";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "months", label: "3 months" },
];

function sessionTimeLabel(iso?: string) {
  if (!iso) return "";
  return format(new Date(iso), "h:mm a");
}

function sessionsOnDay(sessions: CalendarSession[], day: Date) {
  return sessions.filter(
    (s) => s.startsAt && isSameDay(new Date(s.startsAt), day),
  );
}

function monthGridDays(month: Date) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  return eachDayOfInterval({ start, end });
}

/** Desktop month grid with event chips (AURA-089 — phone uses compact + agenda). */
function MonthGrid({
  month,
  sessions,
  onSelectDay,
}: {
  month: Date;
  sessions: CalendarSession[];
  onSelectDay: (day: Date) => void;
}) {
  const days = useMemo(() => monthGridDays(month), [month]);

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line bg-surface px-3 py-2 text-center text-sm font-medium">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-xs uppercase tracking-[0.14em] text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
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
                "min-h-[6.5rem] border-b border-r border-line p-2 text-left align-top",
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

/** Phone: number grid + dots only — tap opens day (AURA-089). */
function MonthCompactGrid({
  month,
  sessions,
  onSelectDay,
}: {
  month: Date;
  sessions: CalendarSession[];
  onSelectDay: (day: Date) => void;
}) {
  const days = useMemo(() => monthGridDays(month), [month]);

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line bg-surface px-3 py-2 text-center text-sm font-medium">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 border-b border-line bg-surface text-center text-[10px] uppercase tracking-[0.14em] text-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="px-0.5 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const count = sessionsOnDay(sessions, day).length;
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={`${format(day, "EEEE MMM d")}${count ? `, ${count} sessions` : ""}`}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 border-b border-r border-line py-1.5",
                !inMonth && "bg-canvas/60 text-muted",
                isToday(day) && "bg-accent/5",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-accent text-accent-ink",
                )}
              >
                {format(day, "d")}
              </span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  count > 0 ? "bg-accent" : "bg-transparent",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Phone: sessions grouped by day for the month (AURA-089). */
function MonthAgenda({
  month,
  sessions,
  onSelectDay,
}: {
  month: Date;
  sessions: CalendarSession[];
  onSelectDay: (day: Date) => void;
}) {
  const daysWithSessions = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end }).filter(
      (day) => sessionsOnDay(sessions, day).length > 0,
    );
  }, [month, sessions]);

  if (daysWithSessions.length === 0) {
    return (
      <Panel className="p-4">
        <EmptyState variant="inline" title="No sessions this month." />
      </Panel>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">
        Sessions · {format(month, "MMM yyyy")}
      </p>
      {daysWithSessions.map((day) => {
        const items = sessionsOnDay(sessions, day);
        return (
          <Panel key={day.toISOString()} className="p-3">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {format(day, "EEE MMM d")}
                {isToday(day) ? " · Today" : ""}
              </p>
              <span className="text-xs text-muted">{items.length}</span>
            </button>
            <ul className="mt-2 space-y-2">
              {items.map((s) => (
                <li key={s.id}>
                  <SessionListLink s={s} />
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

function MonthPhoneView({
  month,
  sessions,
  onSelectDay,
}: {
  month: Date;
  sessions: CalendarSession[];
  onSelectDay: (day: Date) => void;
}) {
  return (
    <div className="space-y-4 md:hidden">
      <MonthCompactGrid
        month={month}
        sessions={sessions}
        onSelectDay={onSelectDay}
      />
      <MonthAgenda
        month={month}
        sessions={sessions}
        onSelectDay={onSelectDay}
      />
    </div>
  );
}

function sessionChipTone(status?: SessionStatus | string): ChipTone {
  if (status === "delivered") return "success";
  if (status === "archived") return "neutral";
  return "accent";
}

function sessionHelperHref(s: CalendarSession) {
  return `/admin/shoots/${s.id}/helper`;
}

/** Decorative in month grid (day cell is the hit target — AURA-282). */
function EventChip({ s }: { s: CalendarSession }) {
  const label = `${s.projectName || s.type} · ${sessionTimeLabel(s.startsAt)}`;
  return (
    <Chip
      tone={sessionChipTone(s.status)}
      title={label}
      className="pointer-events-none w-full"
    >
      {label}
    </Chip>
  );
}

/** Phone list rows — tappable session day (AURA-428). */
function SessionListLink({ s }: { s: CalendarSession }) {
  const label = `${s.projectName || s.type} · ${sessionTimeLabel(s.startsAt)}`;
  return (
    <ButtonLink
      href={sessionHelperHref(s)}
      tone="ghost"
      className="min-h-11 w-full justify-start border border-line bg-surface text-left"
    >
      <span className="truncate" title={label}>
        {label}
      </span>
    </ButtonLink>
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
        <div className="w-full sm:w-auto sm:max-w-md">
          <SegmentedControl
            ariaLabel="Calendar view"
            options={VIEW_OPTIONS}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      {view === "month" ? (
        <>
          <MonthPhoneView
            month={startOfMonth(cursor)}
            sessions={dated}
            onSelectDay={selectDay}
          />
          <div className="hidden md:block">
            <MonthGrid
              month={startOfMonth(cursor)}
              sessions={dated}
              onSelectDay={selectDay}
            />
          </div>
        </>
      ) : null}

      {view === "months" ? (
        <>
          <div className="space-y-6 md:hidden">
            {multiMonths.map((month) => (
              <MonthPhoneView
                key={month.toISOString()}
                month={month}
                sessions={dated}
                onSelectDay={selectDay}
              />
            ))}
          </div>
          <div className="hidden gap-4 md:grid lg:grid-cols-3">
            {multiMonths.map((month) => (
              <MonthGrid
                key={month.toISOString()}
                month={month}
                sessions={dated}
                onSelectDay={selectDay}
              />
            ))}
          </div>
        </>
      ) : null}

      {view === "week" ? (
        <div className="space-y-2 md:hidden">
          {weekDays.map((day) => {
            const items = sessionsOnDay(dated, day);
            return (
              <Panel key={day.toISOString()} className="p-3">
                <button
                  type="button"
                  onClick={() => selectDay(day)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    {format(day, "EEE MMM d")}
                    {isToday(day) ? " · Today" : ""}
                  </p>
                  {items.length > 0 ? (
                    <span className="text-xs text-muted">{items.length}</span>
                  ) : null}
                </button>
                {items.length === 0 ? (
                  <div className="mt-2">
                    <EmptyState variant="inline" title="No sessions" />
                  </div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((s) => (
                      <li key={s.id}>
                        <SessionListLink s={s} />
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
                      <SessionListLink key={s.id} s={s} />
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
            <div className="mt-4">
              <EmptyState variant="inline" title="No sessions this day." />
            </div>
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
                      <Button size="sm">Session day</Button>
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
