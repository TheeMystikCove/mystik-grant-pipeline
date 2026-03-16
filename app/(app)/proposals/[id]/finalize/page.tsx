import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatDate } from "@/lib/utils";
import { markSubmitted, runFullPipeline } from "./actions";
import type { ProposalSection, QAReport } from "@/types";

// Canonical section order for a complete proposal
const SECTION_ORDER = [
  "executive_summary",
  "statement_of_need",
  "project_description",
  "goals_and_objectives",
  "program_activities",
  "evaluation_plan",
  "organizational_capacity",
  "budget_narrative",
  "sustainability_plan",
  "appendices",
];

async function getFinalizeData(id: string) {
  const supabase = await createServerClient();

  const [{ data: proposal }, { data: sections }, { data: qaReports }, { data: agentRuns }] =
    await Promise.all([
      supabase
        .from("proposal_projects")
        .select("*, opportunities(name, funder_name, deadline, award_max)")
        .eq("id", id)
        .single(),
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
        .from("agent_runs")
        .select("agent_name, status, confidence_level, created_at")
        .eq("proposal_project_id", id)
        .eq("status", "complete")
        .order("created_at", { ascending: false }),
    ]);

  return {
    proposal,
    sections: (sections ?? []) as ProposalSection[],
    qaReport: (qaReports?.[0] ?? null) as QAReport | null,
    completedAgents: agentRuns ?? [],
  };
}

function sortSections(sections: ProposalSection[]): ProposalSection[] {
  return [...sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.section_name);
    const bi = SECTION_ORDER.indexOf(b.section_name);
    if (ai === -1 && bi === -1) return a.section_name.localeCompare(b.section_name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default async function FinalizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { proposal, sections, qaReport, completedAgents } = await getFinalizeData(id);

  if (!proposal) notFound();

  const opp = proposal.opportunities as any;
  const sorted = sortSections(sections);
  const totalWords = sections.reduce((sum, s) => sum + (s.word_count ?? 0), 0);
  const isFinalized = proposal.status === "finalized";
  const pipelineRan = completedAgents.length > 0;

  return (
    <>
      <Topbar
        title="Review & Finalize"
        subtitle={opp?.name ?? "Proposal"}
        action={
          <div style={{ display: "flex", gap: "0.625rem" }}>
            {!pipelineRan && (
              <form action={runFullPipeline}>
                <input type="hidden" name="proposal_project_id" value={id} />
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.4375rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ▶ Run Full Pipeline
                </button>
              </form>
            )}
            {pipelineRan && !isFinalized && (
              <form action={markSubmitted}>
                <input type="hidden" name="proposal_project_id" value={id} />
                <button
                  type="submit"
                  style={{
                    background: "var(--success)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.4375rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Mark as Finalized
                </button>
              </form>
            )}
            {isFinalized && (
              <span
                style={{
                  padding: "0.4375rem 0.875rem",
                  background: "var(--success)22",
                  color: "var(--success)",
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                }}
              >
                ✓ Finalized
              </span>
            )}
          </div>
        }
      />

      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "1.25rem",
          padding: "1.5rem",
          overflowY: "auto",
        }}
      >
        {/* Left: compiled proposal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
          {sorted.length === 0 ? (
            <EmptyPipeline proposalProjectId={id} pipelineRan={pipelineRan} />
          ) : (
            sorted.map((s) => <SectionBlock key={s.id} section={s} />)
          )}
        </div>

        {/* Right: sidebar — QA report + stats */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Word count summary */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
              Word Count
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
                marginBottom: "0.25rem",
              }}
            >
              {totalWords.toLocaleString()}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              across {sections.length} sections
            </p>
            {sections.length > 0 && (
              <div style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {sorted.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {s.section_name.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {(s.word_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QA Status */}
          {qaReport && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                QA Review
              </p>
              {qaReport.approval_recommendation && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "3px 10px",
                    borderRadius: "5px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    marginBottom: "0.75rem",
                    background:
                      qaReport.approval_recommendation === "approve"
                        ? "var(--success)22"
                        : qaReport.approval_recommendation === "hold"
                        ? "var(--warning)22"
                        : "var(--danger)22",
                    color:
                      qaReport.approval_recommendation === "approve"
                        ? "var(--success)"
                        : qaReport.approval_recommendation === "hold"
                        ? "var(--warning)"
                        : "var(--danger)",
                  }}
                >
                  {qaReport.approval_recommendation.toUpperCase()}
                </div>
              )}
              {qaReport.qa_summary && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {qaReport.qa_summary}
                </p>
              )}
              {Array.isArray(qaReport.missing_elements_json) &&
                qaReport.missing_elements_json.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        color: "var(--warning)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Missing Elements
                    </p>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {(qaReport.missing_elements_json as string[]).map((item, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            paddingLeft: "0.75rem",
                            borderLeft: "2px solid var(--warning)",
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Completed agents */}
          {completedAgents.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                Agents Run
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {completedAgents.map((run: any) => (
                  <div
                    key={run.agent_name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {run.agent_name.replace(/_/g, " ")}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color:
                          run.confidence_level === "high"
                            ? "var(--success)"
                            : run.confidence_level === "medium"
                            ? "var(--warning)"
                            : "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {run.confidence_level ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export note */}
          {sections.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.5rem",
                }}
              >
                Export
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                Copy the compiled text on the left to paste into your submission portal or Word doc.
              </p>
              {opp?.deadline && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Deadline: <strong>{formatDate(opp.deadline)}</strong>
                </p>
              )}
            </div>
          )}
        </aside>
      </main>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: ProposalSection }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
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
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            textTransform: "capitalize",
          }}
        >
          {section.section_name.replace(/_/g, " ")}
        </h2>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
          {(section.word_count ?? 0).toLocaleString()} words
        </span>
      </div>
      <div style={{ padding: "1.25rem" }}>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}
        >
          {section.draft_text ?? ""}
        </p>
      </div>
    </div>
  );
}

function EmptyPipeline({
  proposalProjectId,
  pipelineRan,
}: {
  proposalProjectId: string;
  pipelineRan: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "3rem",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      {pipelineRan ? (
        <>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Pipeline ran but no sections were produced yet.
          </p>
          <p style={{ fontSize: "0.8125rem" }}>
            Check the Proposal Workspace to review agent outputs.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Pipeline not started
          </p>
          <p style={{ fontSize: "0.8125rem" }}>
            Click <strong style={{ color: "var(--text-secondary)" }}>Run Full Pipeline</strong> above to run all 10 agents and generate your proposal draft.
          </p>
        </>
      )}
    </div>
  );
}
