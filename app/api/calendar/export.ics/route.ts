import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function icsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// ICS requires CRLF line endings
function icsLine(...parts: string[]): string {
  return parts.join("\r\n");
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, name, funder_name, deadline, award_max, status")
    .not("status", "in", '("declined","awarded","archived")')
    .not("deadline", "is", null)
    .order("deadline", { ascending: true });

  const events = (opportunities ?? []).map((opp) => {
    const start = icsDate(opp.deadline);
    // End is exclusive for all-day events — one day after deadline
    const endDate = new Date(opp.deadline);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}`;

    const description = [
      `Funder: ${opp.funder_name}`,
      opp.award_max ? `Award: ${formatCurrency(opp.award_max)}` : null,
      `Status: ${opp.status.replace(/_/g, " ")}`,
      "",
      "Managed via Grant Engine — Thee Mystik Universal Holdings Corp.",
    ]
      .filter(Boolean)
      .join("\\n");

    return icsLine(
      "BEGIN:VEVENT",
      `UID:grant-engine-opp-${opp.id}@theemystikcove.com`,
      `DTSTAMP:${icsDate(new Date().toISOString())}T000000Z`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:DEADLINE: ${opp.name}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:Grant Deadline`,
      "END:VEVENT"
    );
  });

  const calendar = icsLine(
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Thee Mystik Universal Holdings Corp.//Grant Engine//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Grant Engine Deadlines",
    "X-WR-TIMEZONE:UTC",
    ...events,
    "END:VCALENDAR"
  );

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="grant-deadlines.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
