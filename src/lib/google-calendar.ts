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
