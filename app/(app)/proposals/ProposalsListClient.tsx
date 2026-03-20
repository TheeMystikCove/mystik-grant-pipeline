"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

interface Proposal {
  id: string;
  status: string;
  current_stage: string | null;
  updated_at: string;
  opportunities: {
    name: string | null;
    funder_name: string | null;
    deadline: string | null;
    award_max: number | null;
  } | null;
}

interface Props {
  proposals: Proposal[];
}

type SortBy = "updated" | "deadline" | "amount" | "status";

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  in_pipeline: "var(--info)",
  awaiting_approval: "var(--warning)",
  approved: "var(--success)",
  submitted: "var(--success)",
  rejected: "var(--danger)",
  archived: "var(--text-muted)",
};

const STATUS_ORDER: Record<string, number> = {
  awaiting_approval: 0,
  in_pipeline: 1,
  approved: 2,
  draft: 3,
  submitted: 4,
  rejected: 5,
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(s: string | null | undefined): number | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function ProposalsListClient({ proposals }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("updated");

  const sorted = useMemo(() => {
    const arr = [...proposals];
    if (sortBy === "updated") {
      return arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    if (sortBy === "deadline") {
      return arr.sort((a, b) => {
        const da = a.opportunities?.deadline;
        const db = b.opportunities?.deadline;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return new Date(da).getTime() - new Date(db).getTime();
      });
    }
    if (sortBy === "amount") {
      return arr.sort((a, b) => (b.opportunities?.award_max ?? 0) - (a.opportunities?.award_max ?? 0));
    }
    if (sortBy === "status") {
      return arr.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    }
    return arr;
  }, [proposals, sortBy]);

  const SORT_PILLS: { key: SortBy; label: string }[] = [
    { key: "updated",  label: "Recently Updated" },
    { key: "deadline", label: "Deadline ↑" },
    { key: "amount",   label: "Amount ↓" },
    { key: "status",   label: "Status" },
  ];

  if (proposals.length === 0) {
    return (
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderTop: "1px solid var(--border-accent)", borderRadius: "2px",
        padding: "3rem", textAlign: "center", color: "var(--text-muted)",
      }}>
        <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No proposals yet.</p>
        <p style={{ fontSize: "0.8125rem" }}>
          Open an opportunity and click{" "}
          <strong style={{ color: "var(--text-secondary)" }}>Start Proposal</strong> to launch
          the pipeline.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort pills */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginRight: "0.25rem" }}>
          Sort:
        </span>
        {SORT_PILLS.map(({ key, label }) => {
          const isActive = sortBy === key;
          return (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                background: isActive ? "var(--accent)" : "var(--surface-raised)",
                color: isActive ? "#efe8d6" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "20px",
                padding: "0.3rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sorted.map((p) => {
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
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginBottom: "0.25rem",
                }}>
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
                    <span style={{
                      fontSize: "0.75rem",
                      color: days != null && days <= 14 ? "var(--warning)" : "var(--text-muted)",
                    }}>
                      Due {formatDate(p.opportunities.deadline)}
                    </span>
                  )}
                  {p.opportunities?.award_max != null && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Up to ${(p.opportunities.award_max / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
              </div>

              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: "2px",
                fontSize: "0.6875rem", fontWeight: 700,
                background: `${color}22`, color,
                textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
              }}>
                {p.status.replace(/_/g, " ")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
