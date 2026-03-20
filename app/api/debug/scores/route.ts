import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const [{ data: opps, error: oppsErr }, { data: scores, error: scoresErr }] = await Promise.all([
    supabase.from("opportunities").select("id, name, status").limit(5),
    supabase.from("opportunity_scores").select("opportunity_id, total_score").limit(10),
  ]);

  // Also test the join directly
  const { data: joined, error: joinErr } = await supabase
    .from("opportunities")
    .select("id, name, opportunity_scores(*)")
    .limit(3);

  return NextResponse.json({
    opportunities_sample: opps,
    opportunities_error: oppsErr?.message,
    scores_count_sample: scores,
    scores_error: scoresErr?.message,
    join_sample: joined,
    join_error: joinErr?.message,
  });
}
