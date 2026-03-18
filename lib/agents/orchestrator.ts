import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "@/lib/claude/call-agent";
import type { AgentName, AgentOutput } from "@/types";

// Import all agent adapters
import { runGrantOpportunityScout } from "./discovery/grant-opportunity-scout";
import { runEligibilityReadinessChecker } from "./discovery/eligibility-readiness-checker";
import { runGrantMatchPrioritizer } from "./discovery/grant-match-prioritizer";
import { runIntakeOrchestrator } from "./pipeline/intake-orchestrator";
import { runGrantRequirementsParser } from "./pipeline/grant-requirements-parser";
import { runFunderFitAnalyzer } from "./pipeline/funder-fit-analyzer";
import { runResearchEvidenceScout } from "./pipeline/research-evidence-scout";
import { runProgramArchitect } from "./pipeline/program-architect";
import { runNarrativeStrategist } from "./pipeline/narrative-strategist";
import { runBudgetArchitect } from "./pipeline/budget-architect";
import { runEvaluationDesigner } from "./pipeline/evaluation-designer";
import { runComplianceQAReviewer } from "./pipeline/compliance-qa-reviewer";
import { runProposalCompiler } from "./pipeline/proposal-compiler";
import { runRevisionManager } from "./pipeline/revision-manager";
import { runFinalGrantWriter } from "./pipeline/final-grant-writer";

// ─── Agent registry ──────────────────────────────────────────────────────────

const AGENT_REGISTRY: Record<
  AgentName,
  (input: Record<string, unknown>) => Promise<AgentOutput>
> = {
  grant_opportunity_scout: runGrantOpportunityScout,
  eligibility_readiness_checker: runEligibilityReadinessChecker,
  grant_match_prioritizer: runGrantMatchPrioritizer,
  intake_orchestrator: runIntakeOrchestrator,
  grant_requirements_parser: runGrantRequirementsParser,
  funder_fit_analyzer: runFunderFitAnalyzer,
  research_evidence_scout: runResearchEvidenceScout,
  program_architect: runProgramArchitect,
  narrative_strategist: runNarrativeStrategist,
  budget_architect: runBudgetArchitect,
  evaluation_designer: runEvaluationDesigner,
  compliance_qa_reviewer: runComplianceQAReviewer,
  proposal_compiler: runProposalCompiler,
  revision_manager: runRevisionManager,
  final_grant_writer: runFinalGrantWriter,
  multi_funder_adapter: (input) => callAgent({ agentName: "multi_funder_adapter", input }),
};

// ─── Proposal pipeline order ─────────────────────────────────────────────────

export const PIPELINE_SEQUENCE: AgentName[] = [
  "intake_orchestrator",
  "funder_fit_analyzer",
  "program_architect",
  // 04/05/06 run in parallel — handled separately
  "compliance_qa_reviewer",
  "proposal_compiler",
  "revision_manager",
  "final_grant_writer",
];

export const PARALLEL_TIER: AgentName[] = [
  "narrative_strategist",
  "budget_architect",
  "evaluation_designer",
];

// ─── Core orchestrator ───────────────────────────────────────────────────────

export async function runAgent(params: {
  proposalProjectId: string;
  agentName: AgentName;
  input: Record<string, unknown>;
}): Promise<{ runId: string; output: AgentOutput }> {
  const supabase = createAdminClient();
  const { proposalProjectId, agentName, input } = params;

  // 1. Persist queued agent run
  const { data: run, error: insertError } = await supabase
    .from("agent_runs")
    .insert({
      proposal_project_id: proposalProjectId,
      agent_name: agentName,
      input_payload_json: input,
      status: "running",
    })
    .select()
    .single();

  if (insertError || !run) {
    throw new Error(`Failed to create agent run: ${insertError?.message}`);
  }

  // 2. Update proposal current_stage
  await supabase
    .from("proposal_projects")
    .update({ current_stage: agentName, status: "in_pipeline" })
    .eq("id", proposalProjectId);

  try {
    // 3. Load project context and merge into input
    const context = await loadProjectContext(proposalProjectId);
    const enrichedInput = { ...context, ...input };

    // 4. Call the agent adapter
    const adapter = AGENT_REGISTRY[agentName];
    if (!adapter) throw new Error(`No adapter registered for: ${agentName}`);
    const output = await adapter(enrichedInput);

    // 5. Persist output and mark complete
    await supabase
      .from("agent_runs")
      .update({
        output_payload_json: output,
        status: "complete",
        confidence_level: output.confidence_level,
      })
      .eq("id", run.id);

    // 6. Write structured output to downstream tables
    await persistAgentOutput({ proposalProjectId, agentName, output });

    return { runId: run.id, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("agent_runs")
      .update({ status: "error", error_message: message })
      .eq("id", run.id);
    throw err;
  }
}

// ─── Run the parallel tier (04 + 05 + 06) ───────────────────────────────────

export async function runParallelTier(params: {
  proposalProjectId: string;
  input: Record<string, unknown>;
}): Promise<Record<AgentName, AgentOutput>> {
  const results = await Promise.all(
    PARALLEL_TIER.map((agentName) =>
      runAgent({ ...params, agentName }).then(({ output }) => ({
        agentName,
        output,
      }))
    )
  );

  return Object.fromEntries(
    results.map(({ agentName, output }) => [agentName, output])
  ) as Record<AgentName, AgentOutput>;
}

// ─── Context loader ──────────────────────────────────────────────────────────

async function loadProjectContext(
  proposalProjectId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient();

  const [{ data: project }, { data: intake }, { data: recentRuns }] =
    await Promise.all([
      supabase
        .from("proposal_projects")
        .select("*, opportunities(*)")
        .eq("id", proposalProjectId)
        .single(),
      supabase
        .from("project_intake")
        .select("*")
        .eq("proposal_project_id", proposalProjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("agent_runs")
        .select("agent_name, output_payload_json, confidence_level")
        .eq("proposal_project_id", proposalProjectId)
        .eq("status", "complete")
        .order("created_at", { ascending: false }),
    ]);

  // Build a map of agent_name -> latest output for context
  const priorOutputs: Record<string, unknown> = {};
  if (recentRuns) {
    for (const run of recentRuns) {
      if (!priorOutputs[run.agent_name]) {
        priorOutputs[run.agent_name] = run.output_payload_json;
      }
    }
  }

  // Flatten the project_snapshot_json fields to top-level so agents can access them
  // directly without needing to dig into nested JSON.
  const snapshot = (intake as any)?.project_snapshot_json ?? {};

  return {
    proposal_project: project,
    intake: intake ?? {},
    intake_data: snapshot,
    prior_outputs: priorOutputs,
  };
}

// ─── Output persistence router ───────────────────────────────────────────────

async function persistAgentOutput(params: {
  proposalProjectId: string;
  agentName: AgentName;
  output: AgentOutput;
}) {
  const { proposalProjectId, agentName, output } = params;
  const supabase = createAdminClient();
  const sections = output.structured_output as Record<string, string>;

  // Narrative / Budget / Evaluation / Compiler all produce proposal sections
  const SECTION_PRODUCERS: AgentName[] = [
    "narrative_strategist",
    "budget_architect",
    "evaluation_designer",
    "proposal_compiler",
    "final_grant_writer",
  ];

  if (SECTION_PRODUCERS.includes(agentName) && sections) {
    const upserts = Object.entries(sections)
      .filter(([, v]) => typeof v === "string" && v.length > 0)
      .map(([section_name, draft_text]) => ({
        proposal_project_id: proposalProjectId,
        section_name,
        draft_text,
        source_agent: agentName,
        word_count: draft_text.trim().split(/\s+/).length,
      }));

    if (upserts.length > 0) {
      await supabase.from("proposal_sections").upsert(upserts, {
        onConflict: "proposal_project_id,section_name,revision_number",
      });
    }
  }

  // QA Reviewer writes to qa_reports
  if (agentName === "compliance_qa_reviewer") {
    const qa = output.structured_output as Record<string, unknown>;
    await supabase.from("qa_reports").insert({
      proposal_project_id: proposalProjectId,
      qa_summary: qa.qa_summary ?? output.summary,
      missing_elements_json: qa.missing_elements ?? output.missing_information,
      risk_flags_json: qa.risk_flags ?? [],
      revision_checklist_json: qa.revision_checklist ?? output.recommendations,
      approval_recommendation: qa.approval_recommendation ?? null,
    });
  }
}

