import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { PIPELINE_SEQUENCE, PARALLEL_TIER } from "@/lib/agents/orchestrator";
import { approveGate } from "./actions";
import { RunAgentButton } from "@/components/proposals/RunAgentButton";
import type { AgentName, AgentRun, ProposalSection } from "@/types";
import { SectionMarkdown } from "@/components/proposals/SectionMarkdown";

// Fields the user must fill before agents can run
const REQUIRED_INTAKE_FIELDS = [
  "organization_name",
  "mission_statement",
  "program_concept",
  "problem_statement",
  "funding_amount_requested",
  "signatory_name",
];

async function getProposalWorkspace(id: string) {
  const supabase = await createServerClient();

  const [{ data: proposal }, { data: agentRuns }, { data: sections }, { data: qaReports }, { data: intake }] =
    await Promise.all([
      supabase
        .from("proposal_projects")
        .select("*, opportunities(name, funder_name, deadline, award_max)")
        .eq("id", id)
        .single(),
      supabase
        .from("agent_runs")
        .select("*")
        .eq("proposal_project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("proposal_sections")
        .select("*")
        .eq("proposal_project_id", id)
        .order("section_name"),
      supabase
        .from("qa_reports")
        .select("*")
        .eq("proposal_project_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("project_intake")
        .select("project_snapshot_json")
        .eq("proposal_project_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

  const snapshot = (intake?.project_snapshot_json ?? {}) as Record<string, string>;
  const missingFields = REQUIRED_INTAKE_FIELDS.filter((f) => !snapshot[f]?.trim());
  const intakeComplete = missingFields.length === 0;

  return {
    proposal,
    agentRuns: (agentRuns ?? []) as AgentRun[],
    sections: (sections ?? []) as ProposalSection[],
    qaReport: qaReports?.[0] ?? null,
    intakeComplete,
    missingFields,
  };
}

// Latest run per agent
function latestRunMap(runs: AgentRun[]): Record<string, AgentRun> {
  const map: Record<string, AgentRun> = {};
  for (const run of runs) {
    if (!map[run.agent_name]) map[run.agent_name] = run;
  }
  return map;
}

const ALL_PIPELINE: AgentName[] = [
  ...PIPELINE_SEQUENCE.slice(0, 3), // intake, funder_fit, program_architect
  ...PARALLEL_TIER,                  // narrative, budget, evaluation
  ...PIPELINE_SEQUENCE.slice(3),    // compliance, compiler, revision, final
];

const AGENT_LABELS: Record<AgentName, string> = {
  grant_opportunity_scout: "Grant Opportunity Scout",
  eligibility_readiness_checker: "Eligibility Readiness Checker",
  grant_match_prioritizer: "Grant Match Prioritizer",
  intake_orchestrator: "01 · Intake Orchestrator",
  grant_requirements_parser: "01.5 · Requirements Parser",
  funder_fit_analyzer: "02 · Funder Fit Analyzer",
  research_evidence_scout: "02.5 · Research Evidence Scout",
  program_architect: "03 · Program Architect",
  narrative_strategist: "04 · Narrative Strategist",
  budget_architect: "05 · Budget Architect",
  evaluation_designer: "06 · Evaluation Designer",
  compliance_qa_reviewer: "07 · Compliance QA Reviewer",
  proposal_compiler: "08 · Proposal Compiler",
  revision_manager: "09 · Revision Manager",
  final_grant_writer: "10 · Final Grant Writer",
  multi_funder_adapter: "11 · Multi-Funder Adapter",
};

const STATUS_DOT: Record<string, string> = {
  complete: "var(--success)",
  running: "var(--info)",
  error: "var(--danger)",
  queued: "var(--warning)",
};

export default async function ProposalWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { proposal, agentRuns, sections, qaReport, intakeComplete, missingFields } = await getProposalWorkspace(id);

  if (!proposal) notFound();

  const runMap = latestRunMap(agentRuns);
  const opp = proposal.opportunities as any;

  // Find the first agent in the pipeline that hasn't completed yet
  const completedSet = new Set(
    Object.entries(runMap)
      .filter(([, r]) => r.status === "complete")
      .map(([name]) => name)
  );
  const nextPendingAgent: AgentName =
    ALL_PIPELINE.find((a) => !completedSet.has(a)) ?? ALL_PIPELINE[ALL_PIPELINE.length - 1];

  return (
    <>
      <Topbar
        title={opp?.name ?? "Proposal Workspace"}
        subtitle={`${opp?.funder_name ?? ""} · ${proposal.status.replace(/_/g, " ")}`}
      />

      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          overflow: "hidden",
        }}
      >
        {/* ── Left panel: pipeline stages ── */}
        <aside
          style={{
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
            padding: "1rem 0",
          }}
        >
          {/* Intake form link — always visible at top of sidebar */}
          <div style={{ padding: "0 1rem 1rem" }}>
            <Link
              href={`/proposals/${id}/intake`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5625rem 0.75rem",
                background: "var(--surface-accent)",
                border: "1px solid var(--border-accent)",
                borderRadius: "2px",
                textDecoration: "none",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)" }}>
                📋 Intake Form
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                Fill data →
              </span>
            </Link>
          </div>

          <p
            style={{
              padding: "0 1rem 0.625rem",
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
            }}
          >
            Pipeline Stages
          </p>

          {ALL_PIPELINE.map((agentName) => {
            const run = runMap[agentName];
            const dotColor = run ? STATUS_DOT[run.status] ?? "var(--text-muted)" : "var(--border)";
            const isParallel = PARALLEL_TIER.includes(agentName);

            return (
              <div
                key={agentName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.4375rem 1rem",
                  borderLeft: isParallel ? "2px solid var(--accent-muted)" : "2px solid transparent",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: run?.status === "complete" ? "var(--text-primary)" : "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {AGENT_LABELS[agentName]}
                </span>
              </div>
            );
          })}

          {/* Trigger button */}
          {proposal.status !== "submitted" && proposal.status !== "finalized" && (
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <RunAgentButton
                proposalProjectId={id}
                agentName={nextPendingAgent}
                pipelineSequence={ALL_PIPELINE}
                intakeComplete={intakeComplete}
                missingFields={missingFields}
              />
              <Link
                href={`/proposals/${id}/finalize`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.4375rem",
                  borderRadius: "2px",
                  border: "1px solid var(--border)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                Review & Finalize →
              </Link>
            </div>
          )}

          {/* Download .docx — shown once final_grant_writer has run */}
          {completedSet.has("final_grant_writer") && (
            <div style={{ padding: "0 1rem 1rem" }}>
              <a
                href={`/api/proposals/${id}/download`}
                download
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.5rem",
                  borderRadius: "2px",
                  border: "1px solid var(--success)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--success)",
                  textDecoration: "none",
                  letterSpacing: "0.03em",
                }}
              >
                ⬇ Download .docx
              </a>
            </div>
          )}
        </aside>

        {/* ── Right panel: content area ── */}
        <div style={{ overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* QA Report if available */}
          {qaReport && (
            <section
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "1px solid var(--border-accent)",
                borderRadius: "2px",
                padding: "1.25rem",
              }}
            >
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "0.75rem",
                }}
              >
                QA Review
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0.75rem" }}>
                {qaReport.qa_summary}
              </p>
              {qaReport.approval_recommendation && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "4px 10px",
                    borderRadius: "2px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background:
                      qaReport.approval_recommendation === "approve"
                        ? "var(--success)22"
                        : qaReport.approval_recommendation === "reject"
                        ? "var(--danger)22"
                        : "var(--warning)22",
                    color:
                      qaReport.approval_recommendation === "approve"
                        ? "var(--success)"
                        : qaReport.approval_recommendation === "reject"
                        ? "var(--danger)"
                        : "var(--warning)",
                  }}
                >
                  {qaReport.approval_recommendation.toUpperCase()}
                </div>
              )}
            </section>
          )}

          {/* Approval gate */}
          {proposal.status === "awaiting_review" && (
            <section
              style={{
                background: "var(--surface)",
                border: "1px solid var(--warning)",
                borderTop: "1px solid var(--warning)",
                borderRadius: "2px",
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--warning)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Approval Gate
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  Review the pipeline output above, then approve to continue.
                </p>
              </div>
              <form action={approveGate}>
                <input type="hidden" name="proposal_project_id" value={id} />
                <button
                  type="submit"
                  style={{
                    background: "var(--success)",
                    color: "#efe8d6",
                    border: "none",
                    borderRadius: "2px",
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Approve & Continue
                </button>
              </form>
            </section>
          )}

          {/* Proposal sections */}
          {sections.length > 0 && (
            <section>
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "0.875rem",
                }}
              >
                Proposal Sections
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {sections.map((s) => (
                  <SectionCard key={s.id} section={s} />
                ))}
              </div>
            </section>
          )}

          {sections.length === 0 && agentRuns.length === 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "1px solid var(--border-accent)",
                borderRadius: "2px",
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                Pipeline not yet started
              </p>
              <p style={{ fontSize: "0.8125rem" }}>
                Click <strong style={{ color: "var(--text-secondary)" }}>Run Next Agent</strong> in
                the sidebar to begin the Intake Orchestrator.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section,
}: {
  section: ProposalSection;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderTop: "1px solid var(--border-accent)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border-muted)",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              textTransform: "capitalize",
            }}
          >
            {section.section_name.replace(/_/g, " ")}
          </h3>
          <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px" }}>
            {section.word_count} words · by {section.source_agent?.replace(/_/g, " ") ?? "unknown"}
          </p>
        </div>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>
        <SectionMarkdown content={section.draft_text ?? ""} />
      </div>
    </div>
  );
}
