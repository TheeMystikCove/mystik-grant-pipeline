import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatDate, daysUntil } from "@/lib/utils";

async function getProposals() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("proposal_projects")
    .select("*, opportunities(name, funder_name, deadline, award_max)")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  in_pipeline: "var(--info)",
  awaiting_approval: "var(--warning)",
  approved: "var(--success)",
  submitted: "var(--success)",
  rejected: "var(--danger)",
  archived: "var(--text-muted)",
};

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return (
    <>
      <Topbar title="Proposals" subtitle={`${proposals.length} active`} />

      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        {proposals.length === 0 ? (
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
            <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No proposals yet.</p>
            <p style={{ fontSize: "0.8125rem" }}>
              Open an opportunity and click{" "}
              <strong style={{ color: "var(--text-secondary)" }}>Start Proposal</strong> to launch
              the pipeline.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {proposals.map((p: any) => {
              const color = STATUS_COLORS[p.status] ?? "var(--text-muted)";
              const days = daysUntil(p.opportunities?.deadline);

              return (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderTop: "1px solid var(--border-accent)",
                    borderRadius: "2px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    gap: "1rem",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {p.opportunities?.name ?? "Untitled Proposal"}
                    </p>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {p.opportunities?.funder_name ?? "—"}
                      </span>
                      {p.current_stage && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Stage: {p.current_stage.replace(/_/g, " ")}
                        </span>
                      )}
                      {p.opportunities?.deadline && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: days != null && days <= 14 ? "var(--warning)" : "var(--text-muted)",
                          }}
                        >
                          Due {formatDate(p.opportunities.deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      background: `${color}22`,
                      color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {p.status.replace(/_/g, " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
