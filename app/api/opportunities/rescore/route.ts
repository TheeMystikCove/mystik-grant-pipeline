import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "@/lib/claude/call-agent";

export async function POST() {
  const supabase = createAdminClient();

  // Find all opportunities that have no score yet
  const { data: scored } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id");
  const scoredIds = new Set((scored ?? []).map((r) => r.opportunity_id));

  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, funder_name, name, program_area, funder_type, deadline, award_min, award_max, geography, eligibility_text, notes")
    .neq("status", "declined");

  const unscored = (opps ?? []).filter((o) => !scoredIds.has(o.id));

  if (unscored.length === 0) {
    return NextResponse.json({ queued: 0, message: "All opportunities already scored." });
  }

  // Fire-and-forget scoring for each unscored opportunity
  for (const opp of unscored) {
    scoreOne(supabase, opp).catch((err) =>
      console.error("[rescore] failed for", opp.id, err)
    );
  }

  return NextResponse.json({ queued: unscored.length });
}

async function scoreOne(supabase: ReturnType<typeof createAdminClient>, opp: {
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
}) {
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
    .eq("status", "new"); // only advance if still "new"
}
