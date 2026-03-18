import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grant-engine.vercel.app";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${SITE_URL}/auth/google/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
