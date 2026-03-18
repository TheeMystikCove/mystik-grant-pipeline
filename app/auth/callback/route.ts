import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Handles Supabase email magic-link / password-reset redirects.
// Supabase sends the user here with ?code=... after they click the email link.
// We exchange the code for a session and redirect to the intended destination.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Invalid or expired reset link. Please request a new one.")}`
  );
}
