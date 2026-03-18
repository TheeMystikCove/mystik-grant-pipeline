import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { listCalendars } from "@/lib/google/calendar";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRow } = await supabase
    .from("users")
    .select("google_refresh_token")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow?.google_refresh_token) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  try {
    const calendars = await listCalendars(userRow.google_refresh_token);
    return NextResponse.json({ calendars });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch calendars" },
      { status: 500 }
    );
  }
}
