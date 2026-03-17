import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, formatDate, daysUntil, deadlineUrgencyLabel } from "@/lib/utils";
import { OpportunityFinderClient } from "./find/OpportunityFinderClient";
import { createOpportunity } from "./new/actions";
import type { Opportunity } from "@/types";

interface Props {
  searchParams: Promise<{ view?: string }>;
}

async function getOpportunities() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*, opportunity_scores(*)")
    .order("deadline", { ascending: true });
  return (data ?? []) as (Opportunity & { opportunity_scores: { total_score: number; label: string } | null })[];
}

async function getOrgId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();
  return data?.organization_id ?? null;
}

const STATUS_COLORS: Record<string, string> = {
  identified: "var(--text-muted)",
  pursuing: "var(--info)",
  submitted: "var(--success)",
  awarded: "var(--success)",
  declined: "var(--danger)",
  monitoring: "var(--warning)",
};

const FUNDER_TYPES = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "local", label: "Local Government" },
  { value: "private_foundation", label: "Private Foundation" },
  { value: "corporate", label: "Corporate / CSR" },
  { value: "community_foundation", label: "Community Foundation" },
  { value: "other", label: "Other" },
];

export default async function OpportunitiesPage({ searchParams }: Props) {
  const { view } = await searchParams;
  const [opportunities, orgId] = await Promise.all([getOpportunities(), getOrgId()]);

  const isFind = view === "find";
  const isNew  = view === "new";

  // Shared button style factory
  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#efe8d6" : "var(--accent)",
    border: "1px solid var(--accent)",
    borderRadius: "6px",
    padding: "0.4375rem 0.875rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    letterSpacing: "0.02em",
  });

  return (
    <>
      <Topbar
        title="Opportunities"
        subtitle={
          isFind ? "AI-powered grant scout"
          : isNew  ? "Add manually"
          : `${opportunities.length} total`
        }
        action={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/opportunities?view=find" style={tabBtn(isFind)}>
              ✦ Find Grants
            </Link>
            <Link href="/opportunities?view=new" style={tabBtn(isNew)}>
              + Add Manually
            </Link>
          </div>
        }
      />

      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>

        {/* ── Find Grants view ──────────────────────────────────────────── */}
        {isFind && (
          orgId
            ? <OpportunityFinderClient organizationId={orgId} />
            : (
              <div style={emptyCard}>
                No organization linked to your account. Contact your admin.
              </div>
            )
        )}

        {/* ── Add Manually view ─────────────────────────────────────────── */}
        {isNew && (
          <div style={{ maxWidth: "680px" }}>
            <form
              action={createOpportunity}
              style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              <FormCard title="Grant Information">
                <Field label="Opportunity Name *">
                  <Input name="name" placeholder="e.g. SAMHSA Minority AIDS Initiative" required />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Funder Name *">
                    <Input name="funder_name" placeholder="e.g. SAMHSA" required />
                  </Field>
                  <Field label="Funder Type">
                    <select name="funder_type" style={inputStyle}>
                      <option value="">Select type…</option>
                      {FUNDER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Program / Focus Area">
                  <Input name="program_area" placeholder="e.g. Behavioral Health, Workforce Development" />
                </Field>
              </FormCard>

              <FormCard title="Award & Timeline">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <Field label="Award Min ($)">
                    <Input name="award_min" type="number" placeholder="50000" min={0} />
                  </Field>
                  <Field label="Award Max ($)">
                    <Input name="award_max" type="number" placeholder="500000" min={0} />
                  </Field>
                  <Field label="Application Deadline">
                    <Input name="deadline" type="date" />
                  </Field>
                </div>
              </FormCard>

              <FormCard title="Eligibility & Source">
                <Field label="Geographic Restriction">
                  <Input name="geography" placeholder="e.g. Ohio, National, Multi-state" />
                </Field>
                <Field label="Source URL">
                  <Input name="source_url" type="url" placeholder="https://grants.gov/..." />
                </Field>
                <Field label="Notes">
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Key requirements, deal-breakers, contacts, prior history…"
                    style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                  />
                </Field>
              </FormCard>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "#efe8d6",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.625rem 1.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Opportunity
                </button>
                <Link
                  href="/opportunities"
                  style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none" }}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ── Default list view ─────────────────────────────────────────── */}
        {!isFind && !isNew && (
          opportunities.length === 0 ? (
            <div style={emptyCard}>
              <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No opportunities yet.</p>
              <p style={{ fontSize: "0.8125rem" }}>
                Use <strong>Find Grants</strong> to scout automatically or{" "}
                <strong>Add Manually</strong> to track one you found.
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

              {opportunities.map((opp, i) => {
                const days  = daysUntil(opp.deadline);
                const urgent = days != null && days >= 0 && days <= 14;
                const color  = STATUS_COLORS[opp.status] ?? "var(--text-muted)";

                return (
                  <Link
                    key={opp.id}
                    href={`/opportunities/${opp.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.5fr 1fr 1fr 100px 90px",
                      padding: "0.875rem 1.25rem",
                      borderBottom: i < opportunities.length - 1 ? "1px solid var(--border-muted)" : "none",
                      textDecoration: "none",
                      alignItems: "center",
                      gap: "0.5rem",
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
                              opp.opportunity_scores.total_score >= 70 ? "var(--success)"
                              : opp.opportunity_scores.total_score >= 45 ? "var(--warning)"
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
          )
        )}
      </main>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border-muted)" }}>
        <h2
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={inputStyle} />;
}

const emptyCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "3rem",
  textAlign: "center",
  color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
