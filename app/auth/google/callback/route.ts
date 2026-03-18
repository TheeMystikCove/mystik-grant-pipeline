import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google/calendar";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grant-engine.vercel.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${SITE_URL}/account?tab=integrations&error=${encodeURIComponent(
        "Google Calendar connection was cancelled."
      )}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${SITE_URL}/account?tab=integrations&error=${encodeURIComponent(
          "Google did not return a refresh token. Please try connecting again."
        )}`
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${SITE_URL}/login`);

    const admin = createAdminClient();
    await admin
      .from("users")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_calendar_id: "primary",
      })
      .eq("auth_user_id", user.id);

    return NextResponse.redirect(
      `${SITE_URL}/account?tab=integrations&success=${encodeURIComponent(
        "Google Calendar connected. Choose a calendar below and sync your deadlines."
      )}`
    );
  } catch {
    return NextResponse.redirect(
      `${SITE_URL}/account?tab=integrations&error=${encodeURIComponent(
        "Failed to connect Google Calendar. Please try again."
      )}`
    );
  }
}
