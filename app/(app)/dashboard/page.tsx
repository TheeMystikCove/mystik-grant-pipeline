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
          padding: "1.75rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Sovereign stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { label: "Active Opportunities", value: opportunities.length, color: "var(--info)", icon: "◎" },
            { label: "Active Proposals", value: proposals.length, color: "var(--accent)", icon: "◈" },
            { label: "Agent Runs — 7d", value: runCounts.total, color: "var(--text-secondary)", icon: "◇" },
            {
              label: "Errors — 7d",
              value: runCounts.error,
              color: runCounts.error > 0 ? "var(--danger)" : "var(--success)",
              icon: "◆",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "1px solid var(--border-accent)",
                borderRadius: "2px",
                padding: "1.125rem 1.375rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Corner ornament */}
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
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Upcoming Deadlines */}
          <SanctumSection
            title="Upcoming Deadlines"
            viewHref="/opportunities"
            empty={opportunities.length === 0}
            emptyMessage="No active opportunities are being pursued."
          >
            {opportunities.map((opp, i) => {
              const days = daysUntil(opp.deadline);
              const urgent = days != null && days <= 14;
              return (
                <li
                  key={opp.id}
                  style={{
                    padding: "0.875rem 1.375rem",
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
                          {" "}
                          <span style={{ color: "var(--text-faint)" }}>·</span>{" "}
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
                        color: urgent ? "var(--warning)" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}
                    >
                      {formatDate(opp.deadline)}
                    </p>
                    <p
                      style={{
                        fontSize: "0.5625rem",
                        color: "var(--text-muted)",
                        marginTop: "2px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {deadlineUrgencyLabel(days)}
                    </p>
                  </div>
                </li>
              );
            })}
          </SanctumSection>

          {/* Active Proposals */}
          <SanctumSection
            title="Active Proposals"
            viewHref="/proposals"
            empty={proposals.length === 0}
            emptyMessage="No proposals are currently in progress."
          >
            {proposals.map((p, i) => (
              <li
                key={p.id}
                style={{
                  padding: "0.875rem 1.375rem",
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
                <StageChip stage={p.current_stage} status={p.status} />
              </li>
            ))}
          </SanctumSection>
        </div>

        {/* Agent activity — ritual log */}
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
              { label: "Complete", value: runCounts.complete, color: "var(--success)" },
              { label: "Running", value: runCounts.running, color: "var(--info)" },
              { label: "Errors", value: runCounts.error, color: "var(--danger)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.5625rem" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    background: s.color,
                    flexShrink: 0,
                    borderRadius: "50%",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  <strong
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {s.value}
                  </strong>{" "}
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notion sync log */}
        {recentSyncs.length > 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderTop: "1px solid var(--border-accent)",
              borderRadius: "2px",
              padding: "1.125rem 1.375rem",
            }}
          >
            <SectionHeader title="Notion Sync" subtitle="Recent operations" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4375rem",
                marginTop: "0.875rem",
              }}
            >
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
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      textTransform: "capitalize",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {s.sync_type.replace(/_/g, " ")}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.625rem", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
                      {s.last_synced_at
                        ? new Date(s.last_synced_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background:
                          s.status === "synced"
                            ? "var(--success)"
                            : s.status === "error"
                            ? "var(--danger)"
                            : "var(--warning)",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
  children,
}: {
  title: string;
  viewHref: string;
  empty: boolean;
  emptyMessage: string;
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
        <a
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
        </a>
      </div>

      {empty ? (
        <div
          style={{
            padding: "2.25rem 1.375rem",
            textAlign: "center",
            color: "var(--text-faint)",
            fontSize: "0.8125rem",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            letterSpacing: "0.02em",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <ul style={{ listStyle: "none" }}>{children}</ul>
      )}
    </section>
  );
}

function StageChip({ stage, status }: { stage: string | null; status: string }) {
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
        }}
      >
        {status.replace(/_/g, " ")}
      </span>
      {stage && (
        <p
          style={{
            fontSize: "0.5625rem",
            color: "var(--text-muted)",
            marginTop: "3px",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {stage.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}
