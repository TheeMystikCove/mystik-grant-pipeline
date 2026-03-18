import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { startProposal } from "./actions";
import { ScoreForm } from "./ScoreForm";

async function getOpportunity(id: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*, opportunity_scores(*), readiness_checks(*)")
    .eq("id", id)
    .single();
  return data;
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);

  if (!opp) notFound();

  const days = daysUntil(opp.deadline);
  const score = opp.opportunity_scores;
  const readiness = opp.readiness_checks;

  return (
    <>
      <Topbar
        title={opp.name}
        subtitle={opp.funder_name}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {opp.deadline && (() => {
              const d = new Date(opp.deadline);
              const pad = (n: number) => String(n).padStart(2, "0");
              const fmt = (date: Date) =>
                `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
              const end = new Date(d.getTime() + 86400000);
              const gcUrl =
                `https://calendar.google.com/calendar/render?action=TEMPLATE` +
                `&text=${encodeURIComponent(`DEADLINE: ${opp.name}`)}` +
                `&dates=${fmt(d)}%2F${fmt(end)}` +
                `&details=${encodeURIComponent(`Funder: ${opp.funder_name}\nManaged via Grant Engine`)}`;
              return (
                <a
                  href={gcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Add deadline to Google Calendar"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.4375rem 0.75rem",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  📅 Add to Calendar
                </a>
              );
            })()}
            {!["submitted", "awarded", "declined"].includes(opp.status) && (
              <form action={startProposal}>
                <input type="hidden" name="opportunity_id" value={opp.id} />
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
                  Start Proposal
                </button>
              </form>
            )}
          </div>
        }
      />

      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Core details */}
          <section style={cardStyle}>
            <SectionHeader>Opportunity Details</SectionHeader>
            <dl style={dlStyle}>
              <Field label="Funder">{opp.funder_name}</Field>
              <Field label="Funder Type">{opp.funder_type ?? "—"}</Field>
              <Field label="Award Range">
                {opp.award_min || opp.award_max
                  ? `${formatCurrency(opp.award_min)} – ${formatCurrency(opp.award_max)}`
                  : "—"}
              </Field>
              <Field label="Deadline">
                <span style={{ color: days != null && days <= 14 ? "var(--warning)" : "inherit" }}>
                  {formatDate(opp.deadline)}
                  {days != null && days >= 0 && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                      {" "}({days} days)
                    </span>
                  )}
                </span>
              </Field>
              <Field label="Geography">{opp.geography ?? "—"}</Field>
              <Field label="Program Area">{opp.program_area ?? "—"}</Field>
              <Field label="Status">
                <span style={{ textTransform: "capitalize" }}>{opp.status}</span>
              </Field>
              {opp.source_url && (
                <Field label="Source">
                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                  >
                    View RFP ↗
                  </a>
                </Field>
              )}
            </dl>
          </section>

          {/* Score */}
          <section style={cardStyle}>
            <SectionHeader>Priority Score</SectionHeader>
            <ScoreForm opportunityId={opp.id} existing={score ?? null} />
          </section>
        </div>

        {/* Readiness Check */}
        {readiness && (
          <section style={cardStyle}>
            <SectionHeader>Readiness Check</SectionHeader>
            <dl style={dlStyle}>
              <Field label="Recommendation">
                <span
                  style={{
                    textTransform: "capitalize",
                    color:
                      readiness.recommendation === "go"
                        ? "var(--success)"
                        : readiness.recommendation === "no_go"
                        ? "var(--danger)"
                        : "var(--warning)",
                    fontWeight: 600,
                  }}
                >
                  {readiness.recommendation?.replace(/_/g, " ") ?? "—"}
                </span>
              </Field>
              <Field label="UEI / SAM Registered">{readiness.uei_registered ? "Yes" : "No"}</Field>
              <Field label="IRS Letter on File">{readiness.irs_letter_on_file ? "Yes" : "No"}</Field>
              <Field label="Recent Audit">{readiness.recent_audit_on_file ? "Yes" : "No"}</Field>
            </dl>
          </section>
        )}

        {/* Notes */}
        {opp.notes && (
          <section style={cardStyle}>
            <SectionHeader>Notes</SectionHeader>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {opp.notes}
            </p>
          </section>
        )}
      </main>
    </>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "1.25rem",
};

const dlStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: "1rem",
        paddingBottom: "0.625rem",
        borderBottom: "1px solid var(--border-muted)",
      }}
    >
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
      <dt style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{label}</dt>
      <dd
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          textAlign: "right",
          margin: 0,
        }}
      >
        {children}
      </dd>
    </div>
  );
}
