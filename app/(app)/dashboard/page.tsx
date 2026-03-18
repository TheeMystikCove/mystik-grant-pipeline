import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, formatDate, daysUntil, deadlineUrgencyLabel } from "@/lib/utils";
import type { Opportunity, ProposalProject } from "@/types";

async function getDashboardData() {
  const supabase = await createServerClient();

  const [
    { data: opportunities },
    { data: proposals },
    { data: agentRuns },
    { data: recentRuns },
    { count: submittedCount },
  ] = await Promise.all([
    // All active opportunities — not just "pursuing"
    supabase
      .from("opportunities")
      .select("id, name, funder_name, deadline, award_max, status")
      .in("status", ["new", "identified", "pursuing"])
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(6),

    // Active proposals with linked opportunity info
    supabase
      .from("proposal_projects")
      .select("id, status, current_stage, updated_at, opportunities(name, funder_name, deadline, award_max)")
      .not("status", "in", '("archived","finalized")')
      .order("updated_at", { ascending: false })
      .limit(6),

    // Agent runs last 7 days — for activity metrics
    supabase
      .from("agent_runs")
      .select("status")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Most recent 5 agent runs — for activity feed
    supabase
      .from("agent_runs")
      .select("id, agent_name, status, created_at, proposal_project_id, proposal_projects(opportunities(name))")
      .order("created_at", { ascending: false })
      .limit(5),

    // Count of submitted proposals
    supabase
      .from("proposal_projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);

  const runCounts = {
    total: agentRuns?.length ?? 0,
    complete: agentRuns?.filter((r) => r.status === "complete").length ?? 0,
    running: agentRuns?.filter((r) => r.status === "running").length ?? 0,
    error: agentRuns?.filter((r) => r.status === "error").length ?? 0,
  };

  // Total potential funding across active opportunities
  const pipelineValue = (opportunities ?? []).reduce(
    (sum, opp) => sum + (opp.award_max ?? 0),
    0
  );

  return {
    opportunities: (opportunities ?? []) as (Opportunity & { status: string })[],
    proposals: (proposals ?? []) as unknown as (ProposalProject & {
      opportunities: { name: string; funder_name: string; deadline: string | null; award_max: number | null } | null;
    })[],
    runCounts,
    recentRuns: (recentRuns ?? []) as any[],
    pipelineValue,
    submittedCount: submittedCount ?? 0,
  };
}

const AGENT_LABELS: Record<string, string> = {
  intake_orchestrator: "Intake",
  grant_requirements_parser: "Requirements",
  funder_fit_analyzer: "Funder Fit",
  research_evidence_scout: "Research",
  program_architect: "Program",
  narrative_strategist: "Narrative",
  budget_architect: "Budget",
  evaluation_designer: "Evaluation",
  compliance_qa_reviewer: "Compliance QA",
  proposal_compiler: "Compiler",
  revision_manager: "Revision",
  final_grant_writer: "Final Writer",
};

export default async function DashboardPage() {
  const { opportunities, proposals, runCounts, recentRuns, pipelineValue, submittedCount } =
    await getDashboardData();

  return (
    <>
      <Topbar title="Dashboard" subtitle="Mystik Grant Engine" />

      <main
        style={{
          flex: 1,
          padding: "1.75rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Quick actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/opportunities/find"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1.125rem",
              background: "var(--accent)",
              color: "#efe8d6",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              boxShadow: "0 2px 10px #bb7b3d30",
            }}
          >
            ◎ Find Grants
          </Link>
          <Link
            href="/opportunities"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1.125rem",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            View Opportunities →
          </Link>
          <Link
            href="/proposals"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1.125rem",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            View Proposals →
          </Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            {
              label: "Active Opportunities",
              value: opportunities.length,
              color: "var(--info)",
              icon: "◎",
              href: "/opportunities",
            },
            {
              label: "Active Proposals",
              value: proposals.length,
              color: "var(--accent)",
              icon: "◈",
              href: "/proposals",
            },
            {
              label: "Pipeline Value",
              value: pipelineValue > 0 ? formatCurrency(pipelineValue) : "—",
              color: "var(--success)",
              icon: "◆",
              href: "/opportunities",
            },
            {
              label: "Submitted",
              value: submittedCount,
              color: submittedCount > 0 ? "var(--success)" : "var(--text-muted)",
              icon: "◇",
              href: "/proposals",
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderTop: "1px solid var(--border-accent)",
                  borderRadius: "2px",
                  padding: "1.125rem 1.375rem",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "0.625rem",
                    right: "0.75rem",
                    fontSize: "0.4375rem",
                    color: stat.color,
                    opacity: 0.35,
                    letterSpacing: "0.1em",
                  }}
                >
                  {stat.icon}
                </span>
                <p
                  style={{
                    fontSize: "0.5625rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: typeof stat.value === "string" && stat.value.length > 6 ? "1.25rem" : "1.75rem",
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {stat.value}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Main two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Upcoming Deadlines */}
          <SanctumSection
            title="Upcoming Deadlines"
            viewHref="/opportunities"
            empty={opportunities.length === 0}
            emptyMessage="No active opportunities yet."
            emptyCta={{ label: "Find Grants", href: "/opportunities/find" }}
          >
            {opportunities.map((opp, i) => {
              const days = daysUntil(opp.deadline);
              const urgent = days != null && days <= 14;
              const overdue = days != null && days < 0;
              return (
                <li key={opp.id} style={{ borderBottom: i < opportunities.length - 1 ? "1px solid var(--border-muted)" : "none" }}>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.875rem 1.375rem",
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "Inter, system-ui, sans-serif",
                        }}
                      >
                        {opp.name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--text-muted)",
                          marginTop: "3px",
                          fontFamily: "Inter, system-ui, sans-serif",
                        }}
                      >
                        {opp.funder_name}
                        {opp.award_max ? (
                          <>
                            {" "}<span style={{ color: "var(--text-faint)" }}>·</span>{" "}
                            <span style={{ color: "var(--accent)", opacity: 0.8 }}>
                              {formatCurrency(opp.award_max)}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: overdue ? "var(--danger)" : urgent ? "var(--warning)" : "var(--text-secondary)",
                          whiteSpace: "nowrap",
                          fontFamily: "Inter, system-ui, sans-serif",
                        }}
                      >
                        {formatDate(opp.deadline)}
                      </p>
                      <p
                        style={{
                          fontSize: "0.5625rem",
                          color: overdue ? "var(--danger)" : "var(--text-muted)",
                          marginTop: "2px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {deadlineUrgencyLabel(days)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </SanctumSection>

          {/* Active Proposals */}
          <SanctumSection
            title="Active Proposals"
            viewHref="/proposals"
            empty={proposals.length === 0}
            emptyMessage="No proposals in progress."
            emptyCta={{ label: "Browse Opportunities", href: "/opportunities" }}
          >
            {proposals.map((p, i) => (
              <li key={p.id} style={{ borderBottom: i < proposals.length - 1 ? "1px solid var(--border-muted)" : "none" }}>
                <Link
                  href={`/proposals/${p.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.875rem 1.375rem",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}
                    >
                      {p.opportunities?.name ?? "Untitled Proposal"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--text-muted)",
                        marginTop: "3px",
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}
                    >
                      {p.opportunities?.funder_name ?? "—"}
                    </p>
                  </div>
                  <StageChip status={p.status} />
                </Link>
              </li>
            ))}
          </SanctumSection>
        </div>

        {/* Bottom row: Agent activity + Recent runs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Agent metrics */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderTop: "1px solid var(--border-accent)",
              borderRadius: "2px",
              padding: "1.125rem 1.375rem",
            }}
          >
            <SectionHeader title="Agent Activity" subtitle="Last 7 days" />
            <div style={{ display: "flex", gap: "2rem", marginTop: "0.875rem" }}>
              {[
                { label: "Runs", value: runCounts.total, color: "var(--text-secondary)" },
                { label: "Complete", value: runCounts.complete, color: "var(--success)" },
                { label: "Running", value: runCounts.running, color: "var(--info)" },
                { label: "Errors", value: runCounts.error, color: runCounts.error > 0 ? "var(--danger)" : "var(--text-faint)" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: "0.5625rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "Inter, system-ui, sans-serif" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent agent runs feed */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderTop: "1px solid var(--border-accent)",
              borderRadius: "2px",
              padding: "1.125rem 1.375rem",
            }}
          >
            <SectionHeader title="Recent Activity" />
            {recentRuns.length === 0 ? (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", marginTop: "0.875rem", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                No agent runs yet.
              </p>
            ) : (
              <ul style={{ listStyle: "none", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {recentRuns.map((run: any) => {
                  const proposalName = run.proposal_projects?.opportunities?.name ?? "Proposal";
                  const label = AGENT_LABELS[run.agent_name] ?? run.agent_name.replace(/_/g, " ");
                  const statusColor =
                    run.status === "complete" ? "var(--success)"
                    : run.status === "error" ? "var(--danger)"
                    : run.status === "running" ? "var(--info)"
                    : "var(--text-muted)";
                  return (
                    <li key={run.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{label}</span>
                          {" "}<span style={{ color: "var(--text-faint)" }}>·</span>{" "}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{proposalName}</span>
                        </p>
                      </div>
                      <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
                        {run.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.75rem" }}>
      <h2
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <span
          style={{
            fontSize: "0.5625rem",
            color: "var(--text-faint)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

function SanctumSection({
  title,
  viewHref,
  empty,
  emptyMessage,
  emptyCta,
  children,
}: {
  title: string;
  viewHref: string;
  empty: boolean;
  emptyMessage: string;
  emptyCta?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section
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
          padding: "1rem 1.375rem",
          borderBottom: "1px solid var(--border-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--surface-raised)",
        }}
      >
        <h2
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h2>
        <Link
          href={viewHref}
          style={{
            fontSize: "0.5625rem",
            color: "var(--accent)",
            textDecoration: "none",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          View all ›
        </Link>
      </div>

      {empty ? (
        <div
          style={{
            padding: "2.25rem 1.375rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.875rem",
          }}
        >
          <p style={{ color: "var(--text-faint)", fontSize: "0.8125rem", fontFamily: "Georgia, serif", fontStyle: "italic", letterSpacing: "0.02em" }}>
            {emptyMessage}
          </p>
          {emptyCta && (
            <Link
              href={emptyCta.href}
              style={{
                display: "inline-block",
                padding: "0.4375rem 1rem",
                background: "var(--surface-accent)",
                border: "1px solid var(--border-accent)",
                borderRadius: "4px",
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--accent)",
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              {emptyCta.label} →
            </Link>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: "none" }}>{children}</ul>
      )}
    </section>
  );
}

function StageChip({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    draft: "var(--text-muted)",
    in_pipeline: "var(--info)",
    awaiting_approval: "var(--warning)",
    awaiting_review: "var(--warning)",
    approved: "var(--success)",
    submitted: "var(--success)",
    rejected: "var(--danger)",
    archived: "var(--text-muted)",
    finalized: "var(--success)",
  };

  const color = statusColors[status] ?? "var(--text-muted)";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "2px",
        fontSize: "0.5625rem",
        fontWeight: 700,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        whiteSpace: "nowrap",
        fontFamily: "Inter, system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
