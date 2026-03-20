import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/layout/topbar"
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils"

// ── Data ──────────────────────────────────────────────────────────────────────

interface OppWithScore {
  id: string
  name: string
  funder_name: string
  funder_type: string | null
  program_area: string | null
  status: string
  deadline: string | null
  award_min: number | null
  award_max: number | null
  notes: string | null
  opportunity_scores: {
    total_score: number
    label: string
    strategic_fit_score: number
    eligibility_score: number
  } | null
}

async function getPipelineData() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("opportunities")
    .select("id, name, funder_name, funder_type, program_area, status, deadline, award_min, award_max, notes, opportunity_scores(total_score, label, strategic_fit_score, eligibility_score)")
    .not("status", "in", '("archived","rejected")')
    .order("deadline", { ascending: true, nullsFirst: false })
  return (data ?? []) as unknown as OppWithScore[]
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { key: "new",         label: "New",          color: "var(--text-muted)",     icon: "◌" },
  { key: "screening",   label: "Screening",    color: "var(--info)",           icon: "◎" },
  { key: "eligible",    label: "Eligible",     color: "var(--accent)",         icon: "◈" },
  { key: "prioritized", label: "Prioritized",  color: "var(--warning)",        icon: "◆" },
  { key: "pursuing",    label: "Pursuing",     color: "#a78bfa",               icon: "◉" },
  { key: "submitted",   label: "Submitted",    color: "var(--success)",        icon: "◇" },
] as const

const OUTCOME_STAGES = [
  { key: "awarded",     label: "Awarded",      color: "var(--success)"  },
  { key: "declined",    label: "Declined",     color: "var(--danger)"   },
  { key: "not_eligible",label: "Not Eligible", color: "var(--text-faint)" },
  { key: "monitoring",  label: "Monitoring",   color: "var(--text-muted)" },
]

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "var(--success)"
    : score >= 65 ? "var(--accent)"
    : score >= 45 ? "var(--warning)"
    : "var(--danger)"

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 7px",
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: "2px",
      fontSize: "0.5625rem",
      fontWeight: 700,
      color,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      fontFamily: "Inter, system-ui, sans-serif",
      whiteSpace: "nowrap",
    }}>
      {score} · {label}
    </span>
  )
}

// ── Opportunity card ──────────────────────────────────────────────────────────

function OppCard({ opp }: { opp: OppWithScore }) {
  const days = daysUntil(opp.deadline)
  const overdue = days != null && days < 0
  const urgent  = days != null && days >= 0 && days <= 14
  const score   = Array.isArray(opp.opportunity_scores)
    ? (opp.opportunity_scores as unknown[])[0] as OppWithScore["opportunity_scores"]
    : opp.opportunity_scores

  return (
    <Link
      href={`/opportunities/${opp.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "2px",
        padding: "0.75rem 0.875rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.4375rem",
        transition: "border-color 0.1s",
        cursor: "pointer",
      }}>
        {/* Name */}
        <p style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "Georgia, serif",
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {opp.name}
        </p>

        {/* Funder + area */}
        <p style={{
          fontSize: "0.6875rem",
          color: "var(--text-muted)",
          fontFamily: "Inter, system-ui, sans-serif",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {opp.funder_name}
          {opp.program_area && (
            <> <span style={{ color: "var(--text-faint)" }}>·</span> {opp.program_area}</>
          )}
        </p>

        {/* Score badge */}
        {score && <ScoreBadge score={score.total_score} label={score.label} />}

        {/* Award + deadline */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
          {(opp.award_min || opp.award_max) ? (
            <span style={{ fontSize: "0.625rem", color: "var(--accent)", opacity: 0.85, fontFamily: "Inter, system-ui, sans-serif" }}>
              {opp.award_max ? formatCurrency(opp.award_max) : `$${opp.award_min?.toLocaleString()}`}
            </span>
          ) : <span />}
          {opp.deadline && (
            <span style={{
              fontSize: "0.5625rem",
              fontWeight: 600,
              color: overdue ? "var(--danger)" : urgent ? "var(--warning)" : "var(--text-faint)",
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "0.03em",
            }}>
              {overdue ? "OVERDUE" : `${formatDate(opp.deadline)}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PipelinePage() {
  const opportunities = await getPipelineData()

  const byStatus = (status: string) => opportunities.filter((o) => o.status === status)
  const totalActive = STAGES.reduce((n, s) => n + byStatus(s.key).length, 0)
  const totalValue  = opportunities.reduce((n, o) => n + (o.award_max ?? 0), 0)

  return (
    <>
      <Topbar
        title="Pipeline"
        subtitle={`${totalActive} active · ${totalValue > 0 ? formatCurrency(totalValue) : "$0"} potential`}
        action={
          <Link
            href="/opportunities?view=new"
            style={{
              padding: "0.4375rem 1rem",
              background: "var(--accent)",
              color: "#efe8d6",
              borderRadius: "2px",
              textDecoration: "none",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            + Add Opportunity
          </Link>
        }
      />

      <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ── Active pipeline — stage columns ─────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "0.875rem",
          alignItems: "start",
        }}>
          {STAGES.map((stage) => {
            const items = byStatus(stage.key)
            return (
              <div key={stage.key} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Column header */}
                <div style={{
                  padding: "0.5rem 0.625rem",
                  borderBottom: `2px solid ${stage.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.25rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ fontSize: "0.5625rem", color: stage.color }}>{stage.icon}</span>
                    <span style={{
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    color: items.length > 0 ? stage.color : "var(--text-faint)",
                    fontFamily: "Inter, system-ui, sans-serif",
                    background: items.length > 0 ? `${stage.color}18` : "transparent",
                    border: items.length > 0 ? `1px solid ${stage.color}30` : "1px solid transparent",
                    borderRadius: "2px",
                    padding: "1px 5px",
                    minWidth: "18px",
                    textAlign: "center",
                  }}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                {items.length === 0 ? (
                  <div style={{
                    padding: "1.25rem 0.75rem",
                    textAlign: "center",
                    border: "1px dashed var(--border-muted)",
                    borderRadius: "2px",
                  }}>
                    <p style={{ fontSize: "0.625rem", color: "var(--text-faint)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                      Empty
                    </p>
                  </div>
                ) : (
                  items.map((opp) => <OppCard key={opp.id} opp={opp} />)
                )}
              </div>
            )
          })}
        </div>

        {/* ── Outcome row ─────────────────────────────────────────────── */}
        {OUTCOME_STAGES.some((s) => byStatus(s.key).length > 0) && (
          <div>
            <p style={{
              fontSize: "0.5rem",
              color: "var(--text-faint)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "Inter, system-ui, sans-serif",
              marginBottom: "0.75rem",
            }}>
              Outcomes
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", alignItems: "start" }}>
              {OUTCOME_STAGES.map((stage) => {
                const items = byStatus(stage.key)
                if (items.length === 0) return null
                return (
                  <div key={stage.key} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{
                      padding: "0.5rem 0.625rem",
                      borderBottom: `2px solid ${stage.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                    }}>
                      <span style={{
                        fontSize: "0.5625rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}>
                        {stage.label}
                      </span>
                      <span style={{
                        fontSize: "0.5625rem",
                        color: stage.color,
                        fontWeight: 700,
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}>
                        {items.length}
                      </span>
                    </div>
                    {items.map((opp) => <OppCard key={opp.id} opp={opp} />)}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {totalActive === 0 && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "4rem 2rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            textAlign: "center",
          }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No opportunities in the pipeline yet.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", fontFamily: "Inter, system-ui, sans-serif" }}>
              Ask Nexis to add one, or use the button above.
            </p>
            <Link
              href="/opportunities/find"
              style={{
                padding: "0.5rem 1.25rem",
                background: "var(--surface-accent)",
                border: "1px solid var(--border-accent)",
                borderRadius: "2px",
                color: "var(--accent)",
                textDecoration: "none",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Find Grants →
            </Link>
          </div>
        )}
      </main>
    </>
  )
}
