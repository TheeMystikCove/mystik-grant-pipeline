"use client";

import { useState } from "react";
import { saveIntake } from "./actions";

interface Props {
  proposalProjectId: string;
  initial: Record<string, string>;
}

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "org",
    label: "Organization",
    icon: "🏛",
    fields: [
      { key: "organization_name",      label: "Legal Organization Name",           type: "text",     required: true,  placeholder: "Thee Mystik Universal Holdings Corp." },
      { key: "organization_type",      label: "Organization Type",                 type: "select",   required: true,  options: ["501(c)(3) Nonprofit","501(c)(4)","LLC","Corporation","Tribal Entity","Government Agency","Other"] },
      { key: "tax_exempt_status",      label: "Tax-Exempt / EIN Status",           type: "text",     required: false, placeholder: "EIN: 12-3456789 — IRS determination letter on file" },
      { key: "years_in_operation",     label: "Years in Operation",                type: "text",     required: true,  placeholder: "e.g. 8 years (founded 2017)" },
      { key: "staff_size",             label: "Staff Size (FTE + PTE)",            type: "text",     required: true,  placeholder: "e.g. 4 FTE, 6 PTE" },
      { key: "annual_budget",          label: "Annual Operating Budget",           type: "text",     required: true,  placeholder: "e.g. $450,000" },
      { key: "fringe_rate",            label: "Fringe Benefit Rate (%)",           type: "text",     required: false, placeholder: "e.g. 24%" },
      { key: "indirect_rate",          label: "Indirect Cost Rate (% or NICRA)",   type: "text",     required: false, placeholder: "e.g. 10% de minimis — no NICRA on file" },
      { key: "mission_statement",      label: "Mission Statement",                 type: "textarea", required: true,  placeholder: "Full mission statement as it appears in your IRS determination letter or bylaws." },
      { key: "prior_grant_history",    label: "Prior Grant History",               type: "textarea", required: false, placeholder: "List 2–3 relevant grants received (funder, amount, year). Note any federal grant experience." },
    ],
  },
  {
    id: "project",
    label: "Project",
    icon: "📋",
    fields: [
      { key: "program_concept",        label: "Project Concept / Description",     type: "textarea", required: true,  placeholder: "What is this project? What will be built, produced, or delivered? Be specific about format." },
      { key: "deliverable_format",     label: "Deliverable Format",                type: "text",     required: true,  placeholder: "e.g. Digital oral history archive, K-12 curriculum package, interpretive exhibit" },
      { key: "target_population",      label: "Target Population",                 type: "textarea", required: true,  placeholder: "Who benefits from this project? Be specific — demographics, geography, era, background." },
      { key: "target_cemetery",        label: "Target Cemetery (if applicable)",   type: "text",     required: false, placeholder: "e.g. Ohio Western Reserve National Cemetery, Seville, OH" },
      { key: "geographic_area",        label: "Geographic Area Served",            type: "text",     required: true,  placeholder: "e.g. Northeast Ohio — Summit and Cuyahoga counties" },
      { key: "estimated_reach",        label: "Estimated Reach / Scale",           type: "text",     required: false, placeholder: "e.g. 150 Veterans documented, 2,400 annual website visitors" },
      { key: "problem_statement",      label: "Problem / Need Statement",          type: "textarea", required: true,  placeholder: "What problem does this project solve? Include data if available." },
      { key: "program_activities",     label: "Program Activities",                type: "textarea", required: true,  placeholder: "List the main activities: research, community engagement, production, distribution, etc." },
      { key: "expected_outcomes",      label: "Expected Outcomes",                 type: "textarea", required: true,  placeholder: "What will be different because of this project? List 3–5 measurable outcomes." },
      { key: "evidence_available",     label: "Evidence & Research Available",     type: "textarea", required: false, placeholder: "What data, studies, or local statistics support the need? List sources if known." },
    ],
  },
  {
    id: "budget",
    label: "Budget & Timeline",
    icon: "💰",
    fields: [
      { key: "funding_amount_requested", label: "Funding Amount Requested",        type: "text",     required: true,  placeholder: "e.g. $375,000" },
      { key: "project_timeline",         label: "Project Timeline / Grant Period", type: "text",     required: true,  placeholder: "e.g. 18 months — January 2027 through June 2028" },
      { key: "application_deadline",     label: "Application Deadline",            type: "text",     required: false, placeholder: "e.g. July 1, 2026" },
      { key: "funder_name",             label: "Funder Name",                      type: "text",     required: false, placeholder: "Auto-filled from opportunity" },
      { key: "sustainability_notes",    label: "Sustainability Plan",              type: "textarea", required: false, placeholder: "How will this project be maintained after the grant period? Name the sustainability host if known." },
      { key: "sustainability_host",     label: "Sustainability Host Organization", type: "text",     required: false, placeholder: "e.g. Akron-Summit County Public Library — signed MOU pending" },
    ],
  },
  {
    id: "personnel",
    label: "Personnel",
    icon: "👤",
    fields: [
      { key: "signatory_name",          label: "Authorized Signatory — Full Name", type: "text",     required: true,  placeholder: "Full legal name of the person signing the application" },
      { key: "signatory_title",         label: "Authorized Signatory — Title",     type: "text",     required: true,  placeholder: "e.g. Executive Director" },
      { key: "signatory_email",         label: "Authorized Signatory — Email",     type: "text",     required: false, placeholder: "official@organization.org" },
      { key: "signatory_phone",         label: "Authorized Signatory — Phone",     type: "text",     required: false, placeholder: "(555) 555-5555" },
      { key: "lead_historian_name",     label: "Lead Historian / Researcher Name", type: "text",     required: false, placeholder: "Name or 'TBD — search in progress'" },
      { key: "lead_historian_credentials", label: "Lead Historian Credentials",   type: "textarea", required: false, placeholder: "Degree, institution, relevant experience. A 2-page CV will be required as an attachment." },
      { key: "project_director_salary", label: "Project Director Annual Salary",  type: "text",     required: false, placeholder: "e.g. $62,000 — 0.75 FTE on this grant" },
    ],
  },
  {
    id: "partners",
    label: "Partners & Attachments",
    icon: "🤝",
    fields: [
      { key: "partners",                label: "Partner Organizations",            type: "textarea", required: false, placeholder: "List confirmed and pending partners. Note which have signed letters of support." },
      { key: "cemetery_partnership",    label: "Cemetery Administration Contact",  type: "textarea", required: false, placeholder: "Superintendent name, contact info, status of letter of support request." },
      { key: "uei_sam_status",          label: "UEI / SAM.gov Registration Status",type: "text",     required: false, placeholder: "e.g. Active — UEI: ABCDE123FGH4 — expires 2027-03-01" },
      { key: "multi_funder",            label: "Adapting for Multiple Funders?",   type: "select",   required: false, options: ["No — single funder submission","Yes — will adapt for multiple funders"] },
      { key: "rfp_document_type",       label: "RFP / NOFO Source",               type: "text",     required: false, placeholder: "e.g. simpler.grants.gov URL or uploaded PDF name" },
      { key: "additional_notes",        label: "Additional Notes for the Pipeline",type: "textarea", required: false, placeholder: "Any other context the grant writing agents should know." },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function IntakeFormClient({ proposalProjectId, initial }: Props) {
  const [activeSection, setActiveSection] = useState("org");
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleChange(key: string, value: string) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      for (const [key, val] of Object.entries(values)) {
        fd.append(key, val);
      }
      const result = await saveIntake(proposalProjectId, fd);
      if (result.success) {
        setSaved(true);
      } else {
        setErrorMsg(result.error ?? "Save failed");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

  // Count filled fields per section
  const fillCount = (sectionId: string) => {
    const s = SECTIONS.find((sec) => sec.id === sectionId)!;
    return s.fields.filter((f) => values[f.key]?.trim()).length;
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* ── Left nav ── */}
      <nav
        style={{
          width: "200px",
          borderRight: "1px solid var(--border)",
          padding: "1.25rem 0",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <p style={{ padding: "0 1rem 0.75rem", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
          Sections
        </p>
        {SECTIONS.map((s) => {
          const filled = fillCount(s.id);
          const total = s.fields.length;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.5rem 1rem",
                background: active ? "var(--surface-accent)" : "transparent",
                border: "none",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8125rem", color: active ? "var(--accent)" : "var(--text-secondary)", fontWeight: active ? 600 : 400 }}>
                {s.icon} {s.label}
              </span>
              <span style={{ fontSize: "0.625rem", color: filled === total ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>
                {filled}/{total}
              </span>
            </button>
          );
        })}

        {/* Save button in nav */}
        <div style={{ padding: "1.25rem 1rem 0" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              background: saved ? "var(--success)" : "var(--accent)",
              color: "#efe8d6",
              border: "none",
              borderRadius: "6px",
              padding: "0.5625rem",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
          {errorMsg && (
            <p style={{ fontSize: "0.6875rem", color: "var(--danger)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              {errorMsg}
            </p>
          )}
        </div>
      </nav>

      {/* ── Form fields ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem", fontFamily: "Georgia, serif" }}>
          {currentSection.icon} {currentSection.label}
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          These fields are passed directly to the pipeline agents. The more complete this data, the better the proposal.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {currentSection.fields.map((field) => (
            <div key={field.key}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.375rem" }}>
                {field.label}
                {field.required && (
                  <span style={{ color: "var(--danger)", marginLeft: "4px" }}>*</span>
                )}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  style={inputStyle}
                />
              ) : field.type === "select" ? (
                <select
                  value={values[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={{ ...inputStyle, paddingRight: "2rem" }}
                >
                  <option value="">— Select —</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {/* Section bottom save */}
        <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saved ? "var(--success)" : "var(--accent)",
              color: "#efe8d6",
              border: "none",
              borderRadius: "6px",
              padding: "0.5625rem 1.5rem",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Intake Data"}
          </button>

          {/* Navigate to next section */}
          {(() => {
            const idx = SECTIONS.findIndex((s) => s.id === activeSection);
            const next = SECTIONS[idx + 1];
            return next ? (
              <button
                onClick={() => setActiveSection(next.id)}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.8125rem", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                Next: {next.label} →
              </button>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  fontSize: "0.8125rem",
  color: "var(--text-primary)",
  lineHeight: 1.5,
  resize: "vertical" as const,
  boxSizing: "border-box" as const,
};
