import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, formatDate, daysUntil, deadlineUrgencyLabel } from "@/lib/utils";
import type { Opportunity, ProposalProject } from "@/types";

async function getDashboardData() {
  const supabase = await createServerClient();

  const [{ data: opportunities }, { data: proposals }, { data: agentRuns }, { data: syncJobs }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .eq("status", "pursuing")
      .order("deadline", { ascending: true })
      .limit(5),
    supabase
      .from("proposal_projects")
      .select("*, opportunities(name, funder_name, deadline, award_max)")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("agent_runs")
      .select("status")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("notion_sync_jobs")
      .select("sync_type, status, last_synced_at")
      .order("last_synced_at", { ascending: false })
      .limit(5),
  ]);

  const runCounts = {
    total: agentRuns?.length ?? 0,
    complete: agentRuns?.filter((r) => r.status === "complete").length ?? 0,
    running: agentRuns?.filter((r) => r.status === "running").length ?? 0,
    error: agentRuns?.filter((r) => r.status === "error").length ?? 0,
  };

  return {
    opportunities: (opportunities ?? []) as Opportunity[],
    proposals: (proposals ?? []) as (ProposalProject & {
      opportunities: { name: string; funder_name: string; deadline: string | null; award_max: number | null } | null;
    })[],
    runCounts,
    recentSyncs: syncJobs ?? [],
  };
}

export default async function DashboardPage() {
  const { opportunities, proposals, runCounts, recentSyncs } = await getDashboardData();

  return (
    <>
      <Topbar title="Dashboard" subtitle="Mystik Grant Engine" />

      <main
        style={{
          flex: 1,
          padding: "1.5rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { label: "Active Opportunities", value: opportunities.length, color: "var(--info)" },
            { label: "Active Proposals", value: proposals.length, color: "var(--accent)" },
            { label: "Agent Runs (7d)", value: runCounts.total, color: "var(--text-secondary)" },
            { label: "Errors (7d)", value: runCounts.error, color: runCounts.error > 0 ? "var(--danger)" : "var(--success)" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
              }}
            >
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                {stat.label}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", flex: 1 }}>
          {/* Upcoming Deadlines */}
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-muted)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Upcoming Deadlines
              </h2>
              <a
                href="/opportunities"
                style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none" }}
              >
                View all →
              </a>
            </div>

            {opportunities.length === 0 ? (
              <EmptyState message="No active opportunities tracked yet." />
            ) : (
              <ul style={{ listStyle: "none" }}>
                {opportunities.map((opp, i) => {
                  const days = daysUntil(opp.deadline);
                  const urgent = days != null && days <= 14;
                  return (
                    <li
                      key={opp.id}
                      style={{
                        padding: "0.875rem 1.25rem",
                        borderBottom: i < opportunities.length - 1 ? "1px solid var(--border-muted)" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.75rem",
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
                          }}
                        >
                          {opp.name}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {opp.funder_name} · {formatCurrency(opp.award_max)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: urgent ? "var(--warning)" : "var(--text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(opp.deadline)}
                        </p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px" }}>
                          {deadlineUrgencyLabel(days)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Active Proposals */}
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-muted)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Active Proposals
              </h2>
              <a
                href="/proposals"
                style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none" }}
              >
                View all →
              </a>
            </div>

            {proposals.length === 0 ? (
              <EmptyState message="No proposals in progress." />
            ) : (
              <ul style={{ listStyle: "none" }}>
                {proposals.map((p, i) => (
                  <li
                    key={p.id}
                    style={{
                      padding: "0.875rem 1.25rem",
                      borderBottom: i < proposals.length - 1 ? "1px solid var(--border-muted)" : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
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
                        }}
                      >
                        {p.opportunities?.name ?? "Untitled Proposal"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {p.opportunities?.funder_name ?? "—"}
                      </p>
                    </div>
                    <StageChip stage={p.current_stage} status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Pipeline activity bar */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "0.875rem",
            }}
          >
            Agent Activity (last 7 days)
          </h2>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[
              { label: "Complete", value: runCounts.complete, color: "var(--success)" },
              { label: "Running", value: runCounts.running, color: "var(--info)" },
              { label: "Errors", value: runCounts.error, color: "var(--danger)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{s.value}</strong> {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Notion sync log */}
        {recentSyncs.length > 0 && (
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <h2
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "0.875rem",
              }}
            >
              Notion Sync
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {recentSyncs.map((s: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>
                    {s.sync_type.replace(/_/g, " ")}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {s.last_synced_at
                        ? new Date(s.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: s.status === "synced" ? "var(--success)" : s.status === "error" ? "var(--danger)" : "var(--warning)",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "2rem 1.25rem",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.8125rem",
      }}
    >
      {message}
    </div>
  );
}

function StageChip({
  stage,
  status,
}: {
  stage: string | null;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    draft: "var(--text-muted)",
    in_pipeline: "var(--info)",
    awaiting_approval: "var(--warning)",
    approved: "var(--success)",
    submitted: "var(--success)",
    rejected: "var(--danger)",
    archived: "var(--text-muted)",
  };

  const color = statusColors[status] ?? "var(--text-muted)";

  return (
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "0.6875rem",
          fontWeight: 600,
          background: `${color}22`,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {status.replace(/_/g, " ")}
      </span>
      {stage && (
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "3px" }}>
          {stage.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}
