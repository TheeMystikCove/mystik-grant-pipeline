import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, formatDate, daysUntil, deadlineUrgencyLabel } from "@/lib/utils";
import type { Opportunity } from "@/types";

async function getOpportunities() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*, opportunity_scores(*)")
    .order("deadline", { ascending: true });
  return (data ?? []) as (Opportunity & { opportunity_scores: { total_score: number; label: string } | null })[];
}

const STATUS_COLORS: Record<string, string> = {
  identified: "var(--text-muted)",
  pursuing: "var(--info)",
  submitted: "var(--success)",
  awarded: "var(--success)",
  declined: "var(--danger)",
  monitoring: "var(--warning)",
};

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  return (
    <>
      <Topbar
        title="Opportunities"
        subtitle={`${opportunities.length} total`}
        action={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/opportunities/find"
              style={{
                background: "transparent",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                padding: "0.4375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              ✦ Find Grants
            </Link>
            <Link
              href="/opportunities/new"
              style={{
                background: "var(--accent)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "6px",
                padding: "0.4375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              + Add Manually
            </Link>
          </div>
        }
      />

      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        {opportunities.length === 0 ? (
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
            <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No opportunities yet.</p>
            <p style={{ fontSize: "0.8125rem" }}>
              Add your first grant opportunity to start the pipeline.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1fr 1fr 100px 90px",
                padding: "0.625rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>Opportunity</span>
              <span>Funder</span>
              <span>Award</span>
              <span>Deadline</span>
              <span>Score</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            {opportunities.map((opp, i) => {
              const days = daysUntil(opp.deadline);
              const urgent = days != null && days >= 0 && days <= 14;
              const color = STATUS_COLORS[opp.status] ?? "var(--text-muted)";

              return (
                <Link
                  key={opp.id}
                  href={`/opportunities/${opp.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 1fr 1fr 100px 90px",
                    padding: "0.875rem 1.25rem",
                    borderBottom:
                      i < opportunities.length - 1 ? "1px solid var(--border-muted)" : "none",
                    textDecoration: "none",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "background 0.1s",
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
                    {opp.program_area && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {opp.program_area}
                      </p>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opp.funder_name}
                  </p>

                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {formatCurrency(opp.award_max)}
                  </p>

                  <div>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: urgent ? "var(--warning)" : "var(--text-secondary)",
                        fontWeight: urgent ? 600 : 400,
                      }}
                    >
                      {formatDate(opp.deadline)}
                    </p>
                    <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px" }}>
                      {deadlineUrgencyLabel(days)}
                    </p>
                  </div>

                  <div>
                    {opp.opportunity_scores ? (
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color:
                            opp.opportunity_scores.total_score >= 70
                              ? "var(--success)"
                              : opp.opportunity_scores.total_score >= 45
                              ? "var(--warning)"
                              : "var(--danger)",
                        }}
                      >
                        {opp.opportunity_scores.total_score}
                        <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          {" "}/ 100
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                    )}
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      background: `${color}22`,
                      color,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opp.status}
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
