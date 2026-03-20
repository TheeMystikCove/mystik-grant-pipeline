import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "@/lib/claude/call-agent";

// Process up to 15 unscored opportunities per call, 3 at a time concurrently.
// Awaiting the work (rather than fire-and-forget) ensures it completes before
// the route handler returns — Next.js terminates background promises early.

const BATCH_SIZE = 3;
const MAX_PER_CALL = 15;

export async function POST() {
  const supabase = createAdminClient();

  // Find all opportunities that have no score yet
  const { data: scored } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id");
  const scoredIds = new Set((scored ?? []).map((r: { opportunity_id: string }) => r.opportunity_id));

  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, funder_name, name, program_area, funder_type, deadline, award_min, award_max, geography, eligibility_text, notes")
    .neq("status", "declined");

  const unscored = (opps ?? []).filter((o: { id: string }) => !scoredIds.has(o.id)).slice(0, MAX_PER_CALL);

  if (unscored.length === 0) {
    return NextResponse.json({ scored: 0, message: "All opportunities already scored." });
  }

  // Process in batches of BATCH_SIZE, awaiting each batch before moving on
  let successCount = 0;
  for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
    const batch = unscored.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((opp: typeof unscored[number]) => scoreOne(supabase, opp)));
    successCount += results.filter((r) => r.status === "fulfilled").length;
    const failures = results.filter((r) => r.status === "rejected");
    for (const f of failures) {
      console.error("[rescore] batch failure:", (f as PromiseRejectedResult).reason);
    }
  }

  const remaining = (opps ?? []).filter((o: { id: string }) => !scoredIds.has(o.id)).length - unscored.length;

  return NextResponse.json({
    scored: successCount,
    remaining,
    message: remaining > 0
      ? `Scored ${successCount}. ${remaining} remaining — click Score All again to continue.`
      : `Scored ${successCount} opportunities.`,
  });
}

type OppRow = {
  id: string;
  funder_name: string;
  name: string;
  program_area: string | null;
  funder_type: string | null;
  deadline: string | null;
  award_min: number | null;
  award_max: number | null;
  geography: string | null;
  eligibility_text: string | null;
  notes: string | null;
};

async function scoreOne(supabase: ReturnType<typeof createAdminClient>, opp: OppRow) {
  const oppContext = {
    opportunity_id: opp.id,
    funder_name: opp.funder_name,
    opportunity_name: opp.name,
    program_area: opp.program_area,
    funder_type: opp.funder_type,
    deadline: opp.deadline,
    award_min: opp.award_min,
    award_max: opp.award_max,
    geography: opp.geography,
    eligibility_text: opp.eligibility_text,
    notes: opp.notes,
  };

  const scoreOutput = await callAgent({
    agentName: "grant_match_prioritizer",
    input: oppContext,
  });
  const score = scoreOutput.structured_output;

  await supabase.from("opportunity_scores").upsert({
    opportunity_id: opp.id,
    strategic_fit_score: Number(score.strategic_fit_score ?? 0),
    eligibility_score: Number(score.eligibility_score ?? 0),
    readiness_score: Number(score.readiness_score ?? 0),
    award_value_score: Number(score.award_value_score ?? 0),
    urgency_score: Number(score.urgency_score ?? 0),
    total_score: Number(score.total_score ?? score.priority_score ?? 0),
    label: score.label ? String(score.label) : null,
    rationale: score.rationale ? String(score.rationale) : null,
  }, { onConflict: "opportunity_id" });

  await supabase
    .from("opportunities")
    .update({ status: "screening" })
    .eq("id", opp.id)
    .eq("status", "new");
}
