import { readStudioDb } from "@/lib/db/store";

/** Returns busy intervals overlapping the requested window when GCal is connected. */
export async function getBusyIntervals(opts: {
  studioId: string;
  timeMin: string;
  timeMax: string;
}): Promise<{ start: string; end: string }[]> {
  const db = await readStudioDb(opts.studioId);
  if (!db.studio.googleCalendarConnected) {
    // Fall back to Aura sessions as busy blocks
    return db.sessions
      .filter((s) => s.startsAt && s.endsAt)
      .filter((s) => {
        const start = s.startsAt!;
        const end = s.endsAt!;
        return start < opts.timeMax && end > opts.timeMin;
      })
      .map((s) => ({ start: s.startsAt!, end: s.endsAt! }));
  }

  const refresh = db.studio.googleCalendarRefreshToken;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refresh || !clientId || !clientSecret) {
    return db.sessions
      .filter((s) => s.startsAt && s.endsAt)
      .filter((s) => s.startsAt! < opts.timeMax && s.endsAt! > opts.timeMin)
      .map((s) => ({ start: s.startsAt!, end: s.endsAt! }));
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
    if (!tokenRes.ok) return [];
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return [];

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
    if (!freeBusy.ok) return [];
    const data = (await freeBusy.json()) as {
      calendars?: { primary?: { busy?: { start: string; end: string }[] } };
    };
    return data.calendars?.primary?.busy || [];
  } catch {
    return [];
  }
}

export function overlapsBusy(
  startIso: string,
  endIso: string,
  busy: { start: string; end: string }[],
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

/** Push a session to Google Calendar when connected; returns event id or null. */
export async function pushSessionToGoogleCalendar(opts: {
  studioId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string;
}): Promise<string | null> {
  const db = await readStudioDb(opts.studioId);
  if (!db.studio.googleCalendarConnected) return null;
  const refresh = db.studio.googleCalendarRefreshToken;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refresh || !clientId || !clientSecret) return null;

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
    if (!tokenRes.ok) return null;
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return null;

    const create = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
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
    if (!create.ok) return null;
    const event = (await create.json()) as { id?: string };
    return event.id || null;
  } catch {
    return null;
  }
}

