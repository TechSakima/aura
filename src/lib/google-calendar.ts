import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  isSealedGoogleRefreshToken,
  openGoogleRefreshToken,
  sealGoogleRefreshToken,
} from "@/lib/google-token-crypto";
import { notifyDeliveryIssue } from "@/lib/notify/send";

/** Plain refresh token for Google API; lazily seals legacy plaintext (AURA-109). */
async function plainGoogleRefreshToken(
  studioId: string,
  stored: string,
): Promise<string> {
  const plain = openGoogleRefreshToken(stored);
  if (!isSealedGoogleRefreshToken(stored) && plain) {
    await updateStudioDb(studioId, (db) => {
      const cur = db.studio.googleCalendarRefreshToken;
      if (cur && !isSealedGoogleRefreshToken(cur)) {
        db.studio.googleCalendarRefreshToken = sealGoogleRefreshToken(cur);
      }
    }).catch(() => undefined);
  }
  return plain;
}

function calendarDeliveryBody(raw: string): string {
  if (/oauth is not configured/i.test(raw)) return "Calendar sync unavailable";
  if (/token refresh/i.test(raw)) return "Couldn’t refresh calendar connection";
  if (/freeBusy/i.test(raw)) return "Couldn’t read calendar availability";
  return raw.slice(0, 200);
}

/** Persist GCal health for Settings (not called from freeBusy hot path). */
export async function recordGoogleCalendarHealth(
  studioId: string,
  result: { ok: boolean; error?: string },
): Promise<void> {
  const now = new Date().toISOString();
  let alertError: string | null = null;
  await updateStudioDb(studioId, (db) => {
    if (result.ok) {
      db.studio.googleCalendarLastSyncAt = now;
      delete db.studio.googleCalendarLastSyncError;
      return;
    }
    if (result.error) {
      const next = result.error.slice(0, 200);
      const prev = db.studio.googleCalendarLastSyncError || "";
      if (next && next !== prev) alertError = next;
      db.studio.googleCalendarLastSyncError = next;
    }
  });
  if (alertError) {
    await notifyDeliveryIssue({
      studioId,
      kind: "calendar",
      title: "Calendar sync failed",
      body: calendarDeliveryBody(alertError),
      href: "/admin/settings/integrations",
    }).catch((err) => {
      console.error("[google-calendar] notify delivery", err);
    });
  }
}

export type BusyInterval = { start: string; end: string };

/** True only when this studio has a usable Google refresh token (not a stub flag). */
export function studioGoogleCalendarReady(studio: {
  googleCalendarRefreshToken?: string;
}): boolean {
  return Boolean(studio.googleCalendarRefreshToken?.trim());
}

/** Default 1h end when a session has a start but no end (manual create). */
export function defaultSessionEndsAt(startsAt: string): string {
  return new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
}

export type BusyIntervalsResult = {
  busy: BusyInterval[];
  /**
   * Google Calendar is connected but sync failed.
   * Callers must not treat empty `busy` as free (AURA-007).
   */
  syncFailed: boolean;
  syncError?: string;
};

function sessionsAsBusy(
  sessions: { startsAt?: string; endsAt?: string }[],
  timeMin: string,
  timeMax: string,
): BusyInterval[] {
  return sessions
    .filter((s) => s.startsAt && s.endsAt)
    .filter((s) => s.startsAt! < timeMax && s.endsAt! > timeMin)
    .map((s) => ({ start: s.startsAt!, end: s.endsAt! }));
}

/** Returns busy intervals overlapping the requested window when GCal is connected. */
export async function getBusyIntervals(opts: {
  studioId: string;
  timeMin: string;
  timeMax: string;
}): Promise<BusyIntervalsResult> {
  const db = await readStudioDb(opts.studioId);
  if (!studioGoogleCalendarReady(db.studio)) {
    return {
      busy: sessionsAsBusy(db.sessions, opts.timeMin, opts.timeMax),
      syncFailed: false,
    };
  }

  let refresh: string;
  try {
    refresh = await plainGoogleRefreshToken(
      opts.studioId,
      db.studio.googleCalendarRefreshToken!,
    );
  } catch {
    return {
      busy: [],
      syncFailed: true,
      syncError: "Google Calendar token could not be read",
    };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      busy: [],
      syncFailed: true,
      syncError: "Google Calendar OAuth is not configured",
    };
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refresh,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) {
      return {
        busy: [],
        syncFailed: true,
        syncError: "Google Calendar token refresh failed",
      };
    }
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) {
      return {
        busy: [],
        syncFailed: true,
        syncError: "Google Calendar token refresh returned no access token",
      };
    }

    const freeBusy = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: opts.timeMin,
          timeMax: opts.timeMax,
          items: [{ id: "primary" }],
        }),
      },
    );
    if (!freeBusy.ok) {
      return {
        busy: [],
        syncFailed: true,
        syncError: "Google Calendar freeBusy request failed",
      };
    }
    const data = (await freeBusy.json()) as {
      calendars?: { primary?: { busy?: BusyInterval[] } };
    };
    return {
      busy: data.calendars?.primary?.busy || [],
      syncFailed: false,
    };
  } catch {
    return {
      busy: [],
      syncFailed: true,
      syncError: "Google Calendar sync error",
    };
  }
}

export function overlapsBusy(
  startIso: string,
  endIso: string,
  busy: BusyInterval[],
) {
  return busy.some((b) => startIso < b.end && endIso > b.start);
}

/** Expand window by buffer minutes on both sides for conflict checks. */
export function withBuffer(
  startIso: string,
  endIso: string,
  bufferMinutes: number,
): { start: string; end: string } {
  const buf = Math.max(0, bufferMinutes) * 60_000;
  return {
    start: new Date(new Date(startIso).getTime() - buf).toISOString(),
    end: new Date(new Date(endIso).getTime() + buf).toISOString(),
  };
}

export type CalendarWriteResult = {
  eventId: string | null;
  /** Studio has no usable GCal connection — not an error. */
  skipped: boolean;
  /** Connected but the Google write failed. */
  failed: boolean;
  error?: string;
};

async function getGoogleAccessToken(studioId: string): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; skipped: boolean; error?: string }
> {
  const db = await readStudioDb(studioId);
  if (!studioGoogleCalendarReady(db.studio)) {
    return { ok: false, skipped: true };
  }
  let refresh: string;
  try {
    refresh = await plainGoogleRefreshToken(
      studioId,
      db.studio.googleCalendarRefreshToken!,
    );
  } catch {
    return {
      ok: false,
      skipped: false,
      error: "Google Calendar token could not be read",
    };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      skipped: false,
      error: "Google Calendar OAuth is not configured",
    };
  }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refresh,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) {
      return {
        ok: false,
        skipped: false,
        error: "Google Calendar token refresh failed",
      };
    }
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) {
      return {
        ok: false,
        skipped: false,
        error: "Google Calendar token refresh returned no access token",
      };
    }
    return { ok: true, accessToken: access_token };
  } catch {
    return { ok: false, skipped: false, error: "Google Calendar sync error" };
  }
}

async function finishWriteHealth(
  studioId: string,
  result: CalendarWriteResult,
): Promise<CalendarWriteResult> {
  if (result.skipped) return result;
  if (result.failed) {
    await recordGoogleCalendarHealth(studioId, {
      ok: false,
      error: result.error || "Google Calendar sync failed",
    });
  } else {
    await recordGoogleCalendarHealth(studioId, { ok: true });
  }
  return result;
}

/** Push a session to Google Calendar when connected. */
export async function pushSessionToGoogleCalendar(opts: {
  studioId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string;
}): Promise<CalendarWriteResult> {
  const token = await getGoogleAccessToken(opts.studioId);
  if (!token.ok) {
    return finishWriteHealth(opts.studioId, {
      eventId: null,
      skipped: token.skipped,
      failed: !token.skipped,
      error: token.error,
    });
  }

  try {
    const create = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: opts.title,
          description: opts.description || "",
          start: { dateTime: opts.startsAt },
          end: { dateTime: opts.endsAt },
        }),
      },
    );
    if (!create.ok) {
      return finishWriteHealth(opts.studioId, {
        eventId: null,
        skipped: false,
        failed: true,
        error: "Google Calendar create event failed",
      });
    }
    const event = (await create.json()) as { id?: string };
    if (!event.id) {
      return finishWriteHealth(opts.studioId, {
        eventId: null,
        skipped: false,
        failed: true,
        error: "Google Calendar create returned no event id",
      });
    }
    return finishWriteHealth(opts.studioId, {
      eventId: event.id,
      skipped: false,
      failed: false,
    });
  } catch {
    return finishWriteHealth(opts.studioId, {
      eventId: null,
      skipped: false,
      failed: true,
      error: "Google Calendar create error",
    });
  }
}

/** Update an existing Google Calendar event (reschedule). */
export async function updateGoogleCalendarEvent(opts: {
  studioId: string;
  eventId: string;
  title?: string;
  startsAt: string;
  endsAt: string;
  description?: string;
}): Promise<CalendarWriteResult> {
  const token = await getGoogleAccessToken(opts.studioId);
  if (!token.ok) {
    return finishWriteHealth(opts.studioId, {
      eventId: opts.eventId,
      skipped: token.skipped,
      failed: !token.skipped,
      error: token.error,
    });
  }

  try {
    const patch = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(opts.eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(opts.title ? { summary: opts.title } : {}),
          ...(opts.description !== undefined
            ? { description: opts.description }
            : {}),
          start: { dateTime: opts.startsAt },
          end: { dateTime: opts.endsAt },
        }),
      },
    );
    if (!patch.ok) {
      return finishWriteHealth(opts.studioId, {
        eventId: opts.eventId,
        skipped: false,
        failed: true,
        error: "Google Calendar update event failed",
      });
    }
    return finishWriteHealth(opts.studioId, {
      eventId: opts.eventId,
      skipped: false,
      failed: false,
    });
  } catch {
    return finishWriteHealth(opts.studioId, {
      eventId: opts.eventId,
      skipped: false,
      failed: true,
      error: "Google Calendar update error",
    });
  }
}

/** Delete a Google Calendar event (decline / cancel). */
export async function deleteGoogleCalendarEvent(opts: {
  studioId: string;
  eventId: string;
}): Promise<CalendarWriteResult> {
  const token = await getGoogleAccessToken(opts.studioId);
  if (!token.ok) {
    return finishWriteHealth(opts.studioId, {
      eventId: null,
      skipped: token.skipped,
      failed: !token.skipped,
      error: token.error,
    });
  }

  try {
    const del = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(opts.eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token.accessToken}` },
      },
    );
    // 404/410 = already gone — treat as success
    if (!del.ok && del.status !== 404 && del.status !== 410) {
      return finishWriteHealth(opts.studioId, {
        eventId: opts.eventId,
        skipped: false,
        failed: true,
        error: "Google Calendar delete event failed",
      });
    }
    return finishWriteHealth(opts.studioId, {
      eventId: null,
      skipped: false,
      failed: false,
    });
  } catch {
    return finishWriteHealth(opts.studioId, {
      eventId: opts.eventId,
      skipped: false,
      failed: true,
      error: "Google Calendar delete error",
    });
  }
}

/** Probe freeBusy and record health (Settings Integrations). */
export async function probeGoogleCalendarHealth(studioId: string): Promise<{
  connected: boolean;
  syncFailed: boolean;
  syncError?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
}> {
  const db = await readStudioDb(studioId);
  if (!studioGoogleCalendarReady(db.studio)) {
    return { connected: false, syncFailed: false };
  }
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const result = await getBusyIntervals({ studioId, timeMin, timeMax });
  if (result.syncFailed) {
    await recordGoogleCalendarHealth(studioId, {
      ok: false,
      error: result.syncError || "Google Calendar sync failed",
    });
  } else {
    await recordGoogleCalendarHealth(studioId, { ok: true });
  }
  const next = await readStudioDb(studioId);
  return {
    connected: true,
    syncFailed: result.syncFailed,
    syncError: result.syncError,
    lastSyncAt: next.studio.googleCalendarLastSyncAt,
    lastSyncError: next.studio.googleCalendarLastSyncError,
  };
}
