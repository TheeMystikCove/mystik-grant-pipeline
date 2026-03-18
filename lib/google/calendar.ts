const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grant-engine.vercel.app";

export { SITE_URL as GOOGLE_REDIRECT_BASE };

export async function exchangeCodeForTokens(
  code: string
): Promise<{ refresh_token?: string; access_token: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${SITE_URL}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token)
    throw new Error(data.error_description ?? "Failed to refresh Google token");
  return data.access_token;
}

export async function listCalendars(
  refreshToken: string
): Promise<{ id: string; summary: string; primary?: boolean }[]> {
  const token = await refreshAccessToken(refreshToken);
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.items ?? [];
}

export async function upsertDeadlineEvent(
  refreshToken: string,
  calendarId: string,
  oppId: string,
  summary: string,
  description: string,
  date: string // YYYY-MM-DD
): Promise<void> {
  const token = await refreshAccessToken(refreshToken);
  // Google Calendar event IDs must match [a-v0-9]{5,1024}
  // UUID hex chars (0-9a-f) are all within a-v, so stripped UUID is valid
  const eventId = oppId.replace(/-/g, "");

  const endDate = new Date(date + "T00:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endStr = endDate.toISOString().split("T")[0];

  const body = JSON.stringify({
    id: eventId,
    summary,
    description,
    start: { date },
    end: { date: endStr },
    colorId: "11",
  });

  // Try update first (event exists), fall back to insert (new event)
  const updateRes = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    }
  );

  if (updateRes.status === 404) {
    await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
      }
    );
  }
}
