import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Called by the AutoSignOut beacon on pagehide — signs the user out server-side.
export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
