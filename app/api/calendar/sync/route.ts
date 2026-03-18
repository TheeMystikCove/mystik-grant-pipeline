import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { upsertDeadlineEvent } from "@/lib/google/calendar";
import { formatCurrency } from "@/lib/utils";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userRow } = await supabase
    .from("users")
    .select("google_refresh_token, google_calendar_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow?.google_refresh_token) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, name, funder_name, deadline, award_max")
    .not("status", "in", '("declined","awarded","archived")')
    .not("deadline", "is", null);

  const calendarId = userRow.google_calendar_id ?? "primary";
  let synced = 0;
  let errors = 0;

  for (const opp of opportunities ?? []) {
    try {
      const date = opp.deadline.includes("T")
        ? opp.deadline.split("T")[0]
        : opp.deadline;
      const description = [
        `Funder: ${opp.funder_name}`,
        opp.award_max ? `Award: ${formatCurrency(opp.award_max)}` : null,
        "",
        "Managed via Grant Engine — Thee Mystik Universal Holdings Corp.",
      ]
        .filter(Boolean)
        .join("\n");

      await upsertDeadlineEvent(
        userRow.google_refresh_token,
        calendarId,
        opp.id,
        `DEADLINE: ${opp.name}`,
        description,
        date
      );
      synced++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ synced, errors });
}
