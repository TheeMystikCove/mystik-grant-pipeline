"use client";

import { useState, useTransition } from "react";
import { updateProfile, updateOrganization, changePassword } from "./actions";

interface OrgData {
  legal_name: string;
  display_name: string | null;
  entity_type: string | null;
  mission: string | null;
  vision: string | null;
  geography: string | null;
  annual_budget_range: string | null;
}

interface Props {
  fullName: string | null;
  email: string;
  role: string;
  org: OrgData | null;
}

const ENTITY_TYPES = [
  "501(c)(3) Nonprofit",
  "501(c)(4)",
  "LLC",
  "Corporation",
  "Tribal Entity",
  "Government Agency",
  "Other",
];

const TABS = [
  { id: "profile", label: "Profile", icon: "◎" },
  { id: "organization", label: "Organization", icon: "⊞" },
  { id: "security", label: "Security", icon: "◈" },
];

export function AccountSettingsClient({ fullName, email, role, org }: Props) {
  const [activeTab, setActiveTab] = useState("profile");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tab: string; error?: string; success?: boolean } | null>(null);

  function showFeedback(tab: string, result: { error?: string; success?: boolean }) {
    setFeedback({ tab, ...result });
    if (result.success) setTimeout(() => setFeedback(null), 3000);
  }

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      showFeedback("profile", result);
    });
  }

  function handleOrgSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateOrganization(fd);
      showFeedback("organization", result);
    });
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePassword(fd);
      showFeedback("security", result);
      if (result.success) e.currentTarget.reset();
    });
  }

  return (
    <div style={{ display: "flex", gap: "2rem", maxWidth: "860px" }}>
      {/* Tab nav */}
      <nav style={{ width: "160px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "2px", paddingTop: "0.25rem" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFeedback(null); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5625rem 0.75rem",
                background: active ? "var(--surface-accent)" : "transparent",
                border: "none",
                borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                borderRadius: "0 4px 4px 0",
                cursor: "pointer", textAlign: "left",
                fontSize: "0.8125rem",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                transition: "all 0.1s",
              }}
            >
              <span style={{ fontSize: "0.625rem", color: "var(--accent)", opacity: 0.6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Profile tab */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionHeader title="Profile" subtitle="Your personal information visible to your organization." />

            <FormCard>
              <Field label="Full Name" required>
                <Input name="full_name" defaultValue={fullName ?? ""} placeholder="First Last" required />
              </Field>
              <Field label="Email Address">
                <Input value={email} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
                <Hint>Email is managed through your authentication provider and cannot be changed here.</Hint>
              </Field>
              <Field label="Role">
                <Input value={role.replace(/_/g, " ")} readOnly style={{ opacity: 0.6, cursor: "not-allowed", textTransform: "capitalize" }} />
              </Field>
            </FormCard>

            <FormFooter isPending={isPending} feedback={feedback?.tab === "profile" ? feedback : null} />
          </form>
        )}

        {/* Organization tab */}
        {activeTab === "organization" && (
          <form onSubmit={handleOrgSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionHeader title="Organization" subtitle="Details used across all proposals and grant applications." />

            {org ? (
              <>
                <FormCard>
                  <Field label="Legal Organization Name" required>
                    <Input name="legal_name" defaultValue={org.legal_name} placeholder="Full legal name" required />
                  </Field>
                  <Field label="Display Name">
                    <Input name="display_name" defaultValue={org.display_name ?? ""} placeholder="Short name or DBA" />
                  </Field>
                  <Field label="Entity Type">
                    <select name="entity_type" defaultValue={org.entity_type ?? ""} style={inputStyle}>
                      <option value="">— Select —</option>
                      {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Geography Served">
                    <Input name="geography" defaultValue={org.geography ?? ""} placeholder="e.g. Northeast Ohio, National" />
                  </Field>
                  <Field label="Annual Budget Range">
                    <Input name="annual_budget_range" defaultValue={org.annual_budget_range ?? ""} placeholder="e.g. $250,000–$500,000" />
                  </Field>
                </FormCard>

                <FormCard>
                  <Field label="Mission Statement">
                    <textarea name="mission" defaultValue={org.mission ?? ""} rows={4} placeholder="Your organization's mission…" style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                  <Field label="Vision Statement">
                    <textarea name="vision" defaultValue={org.vision ?? ""} rows={3} placeholder="Your organization's vision…" style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                </FormCard>

                <FormFooter isPending={isPending} feedback={feedback?.tab === "organization" ? feedback : null} />
              </>
            ) : (
              <div style={{ ...cardStyle, padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No organization is linked to your account. Contact your administrator.
              </div>
            )}
          </form>
        )}

        {/* Security tab */}
        {activeTab === "security" && (
          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionHeader title="Security" subtitle="Update your account password." />

            <FormCard>
              <Field label="New Password" required>
                <Input name="new_password" type="password" placeholder="Minimum 8 characters" required />
              </Field>
              <Field label="Confirm New Password" required>
                <Input name="confirm_password" type="password" placeholder="Repeat new password" required />
              </Field>
            </FormCard>

            <FormFooter isPending={isPending} feedback={feedback?.tab === "security" ? feedback : null} label="Update Password" />
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border-muted)", paddingBottom: "0.875rem" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
        {title}
      </h2>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{subtitle}</p>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {label}{required && <span style={{ color: "var(--danger)", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{children}</p>;
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={{ ...inputStyle, ...style }} {...props} />;
}

function FormFooter({ isPending, feedback, label = "Save Changes" }: {
  isPending: boolean;
  feedback: { error?: string; success?: boolean } | null;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: feedback?.success ? "var(--success)" : "var(--accent)",
          color: "#efe8d6", border: "none", borderRadius: "6px",
          padding: "0.5625rem 1.5rem", fontSize: "0.8125rem", fontWeight: 700,
          letterSpacing: "0.04em", textTransform: "uppercase",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "background 0.2s",
        }}
      >
        {isPending ? "Saving…" : feedback?.success ? "✓ Saved" : label}
      </button>
      {feedback?.error && (
        <p style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>{feedback.error}</p>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};
