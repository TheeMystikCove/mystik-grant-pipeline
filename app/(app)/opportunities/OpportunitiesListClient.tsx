"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOpportunities } from "./actions";

interface Opportunity {
  id: string;
  name: string;
  funder_name: string;
  program_area: string | null;
  award_max: number | null;
  deadline: string | null;
  status: string;
  opportunity_scores: { total_score: number; label: string } | null;
}

interface Props {
  opportunities: Opportunity[];
}

const STATUS_COLORS: Record<string, string> = {
  identified: "var(--text-muted)",
  pursuing: "var(--info)",
  submitted: "var(--success)",
  awarded: "var(--success)",
  declined: "var(--danger)",
  monitoring: "var(--warning)",
};

function formatCurrency(n: number | null): string {
  if (n == null) return "—";
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(s: string | null): number | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function OpportunitiesListClient({ opportunities }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allSelected = opportunities.length > 0 && selected.size === opportunities.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(opportunities.map((o) => o.id)));
  }

  function toggleOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDelete() {
    const ids = [...selected];
    startTransition(async () => {
      setDeleteError(null);
      const result = await deleteOpportunities(ids);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setSelected(new Set());
      }
    });
  }

  if (opportunities.length === 0) {
    return (
      <div style={emptyCard}>
        <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No opportunities yet.</p>
        <p style={{ fontSize: "0.8125rem" }}>
          Use <strong>Find Grants</strong> to scout automatically or{" "}
          <strong>Add Manually</strong> to track one you found.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          marginBottom: "0.75rem", padding: "0.625rem 1rem",
          background: "var(--surface-accent)", border: "1px solid var(--border-accent)", borderRadius: "8px",
        }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", flex: 1 }}>
            <strong style={{ color: "var(--accent)" }}>{selected.size}</strong>{" "}
            {selected.size === 1 ? "opportunity" : "opportunities"} selected
          </span>
          {deleteError && (
            <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{deleteError}</span>
          )}
          <button onClick={() => setSelected(new Set())} disabled={isPending} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isPending} style={deleteBtnStyle}>
            {isPending ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "0.625rem 1.25rem", borderBottom: "1px solid var(--border)", fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              style={{ cursor: "pointer", width: "15px", height: "15px" }}
            />
          </div>
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
          const isSelected = selected.has(opp.id);

          return (
            <div
              key={opp.id}
              onClick={() => router.push(`/opportunities/${opp.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: COLS,
                padding: "0.875rem 1.25rem",
                borderBottom: i < opportunities.length - 1 ? "1px solid var(--border-muted)" : "none",
                alignItems: "center",
                background: isSelected ? "var(--surface-accent)" : "transparent",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              {/* Checkbox — stopPropagation so row click doesn't also fire */}
              <div onClick={(e) => toggleOne(opp.id, e)} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ cursor: "pointer", width: "15px", height: "15px" }}
                />
              </div>

              {/* Opportunity name + area */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opp.name}
                </p>
                {opp.program_area && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {opp.program_area}
                  </p>
                )}
              </div>

              {/* Funder */}
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {opp.funder_name}
              </p>

              {/* Award */}
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                {formatCurrency(opp.award_max)}
              </p>

              {/* Deadline */}
              <div>
                <p style={{ fontSize: "0.8125rem", color: urgent ? "var(--warning)" : "var(--text-secondary)", fontWeight: urgent ? 600 : 400 }}>
                  {formatDate(opp.deadline)}
                </p>
                {days != null && days >= 0 && (
                  <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px" }}>{days}d left</p>
                )}
              </div>

              {/* Score */}
              <div>
                {opp.opportunity_scores ? (
                  <span style={{
                    fontSize: "0.8125rem", fontWeight: 600,
                    color: opp.opportunity_scores.total_score >= 70 ? "var(--success)"
                      : opp.opportunity_scores.total_score >= 45 ? "var(--warning)"
                      : "var(--danger)",
                  }}>
                    {opp.opportunity_scores.total_score}
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.75rem" }}> / 100</span>
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                )}
              </div>

              {/* Status */}
              <span style={{
                display: "inline-block", padding: "2px 8px", borderRadius: "4px",
                fontSize: "0.6875rem", fontWeight: 600,
                background: `${color}22`, color,
                textTransform: "capitalize" as const, whiteSpace: "nowrap" as const,
              }}>
                {opp.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COLS = "40px 2fr 1.5fr 1fr 1fr 100px 90px";

const emptyCard: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px",
  padding: "3rem", textAlign: "center", color: "var(--text-muted)",
};

const deleteBtnStyle: React.CSSProperties = {
  background: "var(--danger)", color: "#fff", border: "none", borderRadius: "6px",
  padding: "0.4375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)",
  borderRadius: "6px", padding: "0.4375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
};
