import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { OpportunityFinderClient } from "./find/OpportunityFinderClient";
import { OpportunitiesListClient } from "./OpportunitiesListClient";
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
          <OpportunitiesListClient opportunities={opportunities} />
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
