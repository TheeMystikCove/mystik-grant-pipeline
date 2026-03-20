import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "@/lib/claude/call-agent";

const BATCH_SIZE = 3;
const MAX_PER_CALL = 15;

export async function POST() {
  try {
    return await handleRescore();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[rescore] top-level crash:", msg);
    return NextResponse.json({ scored: 0, message: `Server error: ${msg}`, error: msg });
  }
}

async function handleRescore() {
  const supabase = createAdminClient();

  // Check existing scores
  const { data: scored, error: scoreReadErr } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id");

  if (scoreReadErr) {
    return NextResponse.json({
      scored: 0,
      error: `Cannot read opportunity_scores table: ${scoreReadErr.message}`,
      message: `DB error: ${scoreReadErr.message}`,
    });
  }

  const scoredIds = new Set((scored ?? []).map((r: { opportunity_id: string }) => r.opportunity_id));

  const { data: opps, error: oppsErr } = await supabase
    .from("opportunities")
    .select("id, funder_name, name, program_area, funder_type, deadline, award_min, award_max, geography, eligibility_text, notes")
    .neq("status", "declined");

  if (oppsErr) {
    return NextResponse.json({
      scored: 0,
      error: `Cannot read opportunities: ${oppsErr.message}`,
      message: `DB error: ${oppsErr.message}`,
    });
  }

  const allOpps = opps ?? [];
  const unscored = allOpps.filter((o: { id: string }) => !scoredIds.has(o.id)).slice(0, MAX_PER_CALL);

  if (unscored.length === 0) {
    return NextResponse.json({
      scored: 0,
      totalOpps: allOpps.length,
      existingScores: scoredIds.size,
      message: scoredIds.size === 0 && allOpps.length > 0
        ? `Found ${allOpps.length} opportunities but 0 scores — DB write may be blocked. Check RLS on opportunity_scores table.`
        : "All opportunities already scored.",
    });
  }

  // Process in batches, collecting errors
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
    const batch = unscored.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((opp: typeof unscored[number]) => scoreOne(supabase, opp))
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        successCount++;
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        errors.push(msg);
        console.error("[rescore] failure:", msg);
      }
    }
  }

  const remaining = allOpps.filter((o: { id: string }) => !scoredIds.has(o.id)).length - unscored.length;

  const message = errors.length > 0 && successCount === 0
    ? `All ${unscored.length} failed. First error: ${errors[0]}`
    : remaining > 0
    ? `Scored ${successCount}${errors.length ? ` (${errors.length} failed)` : ""}. ${remaining} remaining — click again.`
    : `Scored ${successCount} opportunities${errors.length ? ` (${errors.length} failed: ${errors[0]})` : ""}.`;

  return NextResponse.json({ scored: successCount, remaining, errors: errors.slice(0, 3), message });
}

type OppRow = {
  id: string; funder_name: string; name: string;
  program_area: string | null; funder_type: string | null;
  deadline: string | null; award_min: number | null;
  award_max: number | null; geography: string | null;
  eligibility_text: string | null; notes: string | null;
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

  const scoreOutput = await callAgent({ agentName: "grant_match_prioritizer", input: oppContext });
  const score = scoreOutput.structured_output;

  const { error: delErr } = await supabase
    .from("opportunity_scores")
    .delete()
    .eq("opportunity_id", opp.id);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

  const { error: insErr } = await supabase.from("opportunity_scores").insert({
    opportunity_id: opp.id,
    strategic_fit_score: Number(score.strategic_fit_score ?? 0),
    eligibility_score: Number(score.eligibility_score ?? 0),
    readiness_score: Number(score.readiness_score ?? 0),
    award_value_score: Number(score.award_value_score ?? 0),
    urgency_score: Number(score.urgency_score ?? 0),
    total_score: Number(score.total_score ?? score.priority_score ?? 0),
    label: score.label ? String(score.label) : null,
    rationale: score.rationale ? String(score.rationale) : null,
  });
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

  await supabase
    .from("opportunities")
    .update({ status: "screening" })
    .eq("id", opp.id)
    .eq("status", "new");
}
