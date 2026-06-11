import { NextRequest, NextResponse } from "next/server";
import { runAgent, runParallelTier, PIPELINE_SEQUENCE } from "@/lib/agents/orchestrator";
import { createClient } from "@/lib/supabase/server";
import { resolveGrantTier, resolveAccess } from "@/lib/nexis/surface-gate";

/**
 * POST /api/agents/run-pipeline
 *
 * Runs the full proposal pipeline sequentially, with the parallel tier
 * (narrative, budget, evaluation) executed concurrently after program_architect.
 *
 * NEXIS surface: backend_ops — requires ADMIN_OPERATIONS minimum.
 * Until the grant-engine role column is added, this route is restricted to
 * users explicitly elevated by an admin. See lib/nexis/surface-gate.ts.
 *
 * The pipeline order:
 *   1. intake_orchestrator
 *   2. funder_fit_analyzer
 *   3. program_architect
 *   4+5+6. narrative_strategist + budget_architect + evaluation_designer  (parallel)
 *   7. compliance_qa_reviewer
 *   8. proposal_compiler
 *   9. revision_manager
 *  10. final_grant_writer
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── NEXIS tier check: run-pipeline maps to backend_ops surface ────────────
    // Requires ADMIN_OPERATIONS minimum. Currently defaults to STAFF_SPECIALIST
    // until a role column is added to the users table.
    const tier = resolveGrantTier(undefined);
    const access = resolveAccess(tier, "backend_ops");
    if (access.decision === "deny") {
      return NextResponse.json(
        { error: "Forbidden", reason: access.reason, nexis_tier: tier },
        { status: 403 }
      );
    }

    const { proposalProjectId } = await req.json();

    if (!proposalProjectId) {
      return NextResponse.json({ error: "proposalProjectId is required" }, { status: 400 });
    }

    const results: Record<string, unknown> = {};

    // Sequential stages before the parallel tier
    const BEFORE_PARALLEL: typeof PIPELINE_SEQUENCE = [
      "intake_orchestrator",
      "funder_fit_analyzer",
      "program_architect",
    ];

    // Sequential stages after the parallel tier
    const AFTER_PARALLEL: typeof PIPELINE_SEQUENCE = [
      "compliance_qa_reviewer",
      "proposal_compiler",
      "revision_manager",
      "final_grant_writer",
    ];

    // 1–3: Sequential
    for (const agentName of BEFORE_PARALLEL) {
      const { output } = await runAgent({
        proposalProjectId,
        agentName,
        input: {},
      });
      results[agentName] = { summary: output.summary, confidence: output.confidence_level };
    }

    // 4–6: Parallel tier
    const parallelResults = await runParallelTier({
      proposalProjectId,
      input: {},
    });
    for (const [name, output] of Object.entries(parallelResults)) {
      results[name] = { summary: output.summary, confidence: output.confidence_level };
    }

    // 7–10: Sequential
    for (const agentName of AFTER_PARALLEL) {
      const { output } = await runAgent({
        proposalProjectId,
        agentName,
        input: {},
      });
      results[agentName] = { summary: output.summary, confidence: output.confidence_level };
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
