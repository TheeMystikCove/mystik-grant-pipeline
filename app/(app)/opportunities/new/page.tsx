import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { createOpportunity } from "./actions";

const FUNDER_TYPES = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "local", label: "Local Government" },
  { value: "private_foundation", label: "Private Foundation" },
  { value: "corporate", label: "Corporate / CSR" },
  { value: "community_foundation", label: "Community Foundation" },
  { value: "other", label: "Other" },
];

export default function NewOpportunityPage() {
  return (
    <>
      <Topbar title="Add Opportunity" subtitle="Track a new grant or funding source" />

      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        <div style={{ maxWidth: "680px" }}>
          <form
            action={createOpportunity}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* Section: Core Info */}
            <FormCard title="Grant Information">
              <Field label="Opportunity Name *">
                <Input name="name" placeholder="e.g. SAMHSA Minority AIDS Initiative" required />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Funder Name *">
                  <Input name="funder_name" placeholder="e.g. SAMHSA" required />
                </Field>
                <Field label="Funder Type">
                  <select
                    name="funder_type"
                    style={inputStyle}
                  >
                    <option value="">Select type…</option>
                    {FUNDER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Program / Focus Area">
                <Input name="program_area" placeholder="e.g. Behavioral Health, Workforce Development" />
              </Field>
            </FormCard>

            {/* Section: Award & Deadline */}
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

            {/* Section: Logistics */}
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
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "80px",
                  }}
                />
              </Field>
            </FormCard>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="submit"
                style={{
                  background: "var(--accent)",
                  color: "#efe8d6",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px #bb7b3d30",
                }}
              >
                Save Opportunity
              </button>
              <Link
                href="/opportunities"
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
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
        borderTop: "1px solid var(--border-accent)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border-muted)",
        }}
      >
        <h2
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
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

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
