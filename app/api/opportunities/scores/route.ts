import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({});

  const idList = ids.split(",").filter(Boolean).slice(0, 100); // cap at 100
  if (idList.length === 0) return NextResponse.json({});

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("opportunity_scores")
      .select("opportunity_id, total_score")
      .in("opportunity_id", idList);

    if (error) throw error;

    // Return as { [opportunityId]: totalScore }
    const map: Record<string, number> = {};
    for (const row of data ?? []) {
      map[row.opportunity_id] = Number(row.total_score ?? 0);
    }

    return NextResponse.json(map);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[opportunities/scores]", message);
    return NextResponse.json({}, { status: 500 });
  }
}
