"use client";

import { useState, useTransition, useEffect } from "react";
import {
  updateProfile,
  updateOrganization,
  changePassword,
  disconnectGoogle,
  setGoogleCalendar,
  inviteTeamMember,
} from "./actions";

interface OrgData {
  legal_name: string;
  display_name: string | null;
  entity_type: string | null;
  mission: string | null;
  vision: string | null;
  geography: string | null;
  annual_budget_range: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

interface Props {
  fullName: string | null;
  email: string;
  role: string;
  org: OrgData | null;
  initialTab?: string;
  googleConnected: boolean;
  googleCalendarId: string | null;
  feedbackFromUrl?: { error?: string; success?: string };
  teamMembers: TeamMember[];
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
  { id: "integrations", label: "Integrations", icon: "◉" },
  { id: "team", label: "Team", icon: "◑" },
];

export function AccountSettingsClient({
  fullName,
  email,
  role,
  org,
  initialTab,
  googleConnected,
  googleCalendarId,
  feedbackFromUrl,
  teamMembers,
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab ?? "profile");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tab: string; error?: string; success?: boolean } | null>(null);

  function showFeedback(tab: string, result: { error?: string; success?: boolean }) {
    setFeedback({ tab, ...result });
    if (result.success) setTimeout(() => setFeedback(null), 3000);
  }

  function handleProfileSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateProfile(fd);
        showFeedback("profile", result);
      } catch (err) {
        showFeedback("profile", { error: err instanceof Error ? err.message : "An unexpected error occurred." });
      }
    });
  }

  function handleOrgSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateOrganization(fd);
        showFeedback("organization", result);
      } catch (err) {
        showFeedback("organization", { error: err instanceof Error ? err.message : "An unexpected error occurred." });
      }
    });
  }

  function handlePasswordSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      try {
        const result = await changePassword(fd);
        showFeedback("security", result);
        if (result.success) form.reset();
      } catch (err) {
        showFeedback("security", { error: err instanceof Error ? err.message : "An unexpected error occurred." });
      }
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

        {/* Integrations tab */}
        {activeTab === "integrations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionHeader title="Integrations" subtitle="Connect external services to enhance your workflow." />

            {/* URL feedback from OAuth redirect */}
            {feedbackFromUrl?.error && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(180,60,60,0.08)",
                border: "1px solid var(--danger)",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                color: "var(--danger)",
              }}>
                {feedbackFromUrl.error}
              </div>
            )}
            {feedbackFromUrl?.success && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(60,160,80,0.08)",
                border: "1px solid var(--success)",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                color: "var(--success)",
              }}>
                {feedbackFromUrl.success}
              </div>
            )}

            <GoogleCalendarTab
              googleConnected={googleConnected}
              googleCalendarId={googleCalendarId}
            />
          </div>
        )}

        {/* Team tab */}
        {activeTab === "team" && (
          <TeamTab
            teamMembers={teamMembers}
            userRole={role}
            currentEmail={email}
          />
        )}
      </div>
    </div>
  );
}

// ─── Google Calendar Tab ──────────────────────────────────────────────────────

function GoogleCalendarTab({
  googleConnected,
  googleCalendarId,
}: {
  googleConnected: boolean;
  googleCalendarId: string | null;
}) {
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary?: boolean }[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState(googleCalendarId ?? "primary");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);
  const [calendarFeedback, setCalendarFeedback] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!googleConnected) return;
    fetch("/api/google/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendars) setCalendars(data.calendars);
      })
      .catch(() => {/* silently ignore */});
  }, [googleConnected]);

  async function handleSync() {
    setSyncStatus("syncing");
    setSyncResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      setSyncStatus(res.ok ? "done" : "error");
    } catch {
      setSyncStatus("error");
    }
  }

  function handleSaveCalendar() {
    const fd = new FormData();
    fd.set("calendar_id", selectedCalendar);
    startTransition(async () => {
      try {
        const result = await setGoogleCalendar(fd);
        setCalendarFeedback(result);
        if (result.success) setTimeout(() => setCalendarFeedback(null), 3000);
      } catch (err) {
        setCalendarFeedback({ error: err instanceof Error ? err.message : "Failed to save." });
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      try {
        await disconnectGoogle();
        // Page will revalidate and re-render with googleConnected = false
        window.location.reload();
      } catch {
        setCalendarFeedback({ error: "Failed to disconnect Google Calendar." });
      }
    });
  }

  return (
    <div style={{ ...cardStyle, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📅</span>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Google Calendar
            </p>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px" }}>
              Sync grant deadlines directly to your calendar
            </p>
          </div>
        </div>
        {googleConnected && (
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, color: "var(--success)",
            background: "rgba(60,160,80,0.1)", border: "1px solid var(--success)",
            borderRadius: "4px", padding: "0.1875rem 0.5rem", letterSpacing: "0.04em",
          }}>
            ✓ Connected
          </span>
        )}
      </div>

      {!googleConnected ? (
        /* ── Not connected ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Connect Google Calendar to automatically sync all grant deadlines directly to a specific calendar.
          </p>
          <div>
            <a
              href="/auth/google"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5625rem 1.25rem",
                background: "var(--accent)", color: "#efe8d6",
                border: "none", borderRadius: "6px",
                fontSize: "0.8125rem", fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                textDecoration: "none", cursor: "pointer",
              }}
            >
              Connect Google Calendar
            </a>
          </div>
        </div>
      ) : (
        /* ── Connected ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Calendar picker */}
          <Field label="Sync deadlines to this calendar">
            <select
              value={selectedCalendar}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              style={inputStyle}
            >
              <option value="primary">Primary Calendar</option>
              {calendars
                .filter((c) => c.id !== "primary")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}{c.primary ? " (primary)" : ""}
                  </option>
                ))}
            </select>
          </Field>

          {/* Calendar feedback */}
          {calendarFeedback?.error && (
            <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{calendarFeedback.error}</p>
          )}
          {calendarFeedback?.success && (
            <p style={{ fontSize: "0.75rem", color: "var(--success)" }}>✓ Calendar saved</p>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Save calendar */}
            <button
              onClick={handleSaveCalendar}
              disabled={isPending}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--accent)", color: "#efe8d6",
                border: "none", borderRadius: "6px",
                fontSize: "0.8125rem", fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Saving…" : "Save Calendar"}
            </button>

            {/* Sync button */}
            {syncStatus === "syncing" ? (
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Syncing…</span>
            ) : syncStatus === "done" && syncResult ? (
              <span style={{ fontSize: "0.8125rem", color: "var(--success)", fontWeight: 600 }}>
                ✓ {syncResult.synced} synced{syncResult.errors > 0 ? ` · ${syncResult.errors} failed` : ""}
              </span>
            ) : syncStatus === "error" ? (
              <span style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>Sync failed — try again</span>
            ) : (
              <button
                onClick={handleSync}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--surface-raised)", color: "var(--accent)",
                  border: "1px solid var(--border-accent)", borderRadius: "6px",
                  fontSize: "0.8125rem", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sync Deadlines Now
              </button>
            )}

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              style={{
                marginLeft: "auto",
                padding: "0.5rem 1rem",
                background: "transparent", color: "var(--danger)",
                border: "1px solid var(--danger)", borderRadius: "6px",
                fontSize: "0.75rem", fontWeight: 600,
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({
  teamMembers,
  userRole,
  currentEmail,
}: {
  teamMembers: TeamMember[];
  userRole: string;
  currentEmail: string;
}) {
  const [inviteFeedback, setInviteFeedback] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInvite(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      try {
        const result = await inviteTeamMember(fd);
        setInviteFeedback(result);
        if (result.success) {
          form.reset();
          setTimeout(() => setInviteFeedback(null), 4000);
        }
      } catch (err) {
        setInviteFeedback({ error: err instanceof Error ? err.message : "Failed to send invitation." });
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SectionHeader title="Team" subtitle="Members in your organization." />

      {/* Current members */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {teamMembers.length === 0 ? (
          <p style={{ padding: "1.25rem", fontSize: "0.8125rem", color: "var(--text-muted)", textAlign: "center" }}>
            No team members found.
          </p>
        ) : (
          teamMembers.map((member, i) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1.25rem",
                borderBottom: i < teamMembers.length - 1 ? "1px solid var(--border-muted)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", fontFamily: "Inter, system-ui, sans-serif" }}>
                  {member.full_name ?? "(Name not set)"}
                  {member.email === currentEmail && (
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.625rem", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em" }}>YOU</span>
                  )}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>{member.email}</p>
              </div>
              <span style={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: member.role === "founder_admin" ? "var(--accent)" : "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: member.role === "founder_admin" ? "var(--surface-accent)" : "var(--surface-raised)",
                border: `1px solid ${member.role === "founder_admin" ? "var(--border-accent)" : "var(--border)"}`,
                borderRadius: "4px",
                padding: "0.1875rem 0.5rem",
                flexShrink: 0,
              }}>
                {member.role.replace(/_/g, " ")}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Invite form — founder_admin only */}
      {userRole === "founder_admin" && (
        <div style={{ ...cardStyle, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>Invite a Team Member</p>
          <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <Field label="Email Address" required>
              <Input name="invite_email" type="email" placeholder="colleague@example.com" required />
            </Field>
            <Field label="Role">
              <select name="invite_role" defaultValue="grant_strategist" style={inputStyle}>
                <option value="founder_admin">Founder Admin</option>
                <option value="grant_strategist">Grant Strategist</option>
                <option value="program_lead">Program Lead</option>
                <option value="reviewer">Reviewer</option>
                <option value="ops_assistant">Ops Assistant</option>
              </select>
            </Field>

            {inviteFeedback?.error && (
              <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{inviteFeedback.error}</p>
            )}
            {inviteFeedback?.success && (
              <p style={{ fontSize: "0.75rem", color: "var(--success)" }}>✓ Invitation sent — they&apos;ll receive an email with a sign-in link.</p>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  padding: "0.5rem 1.25rem",
                  background: "var(--accent)", color: "#efe8d6",
                  border: "none", borderRadius: "6px",
                  fontSize: "0.8125rem", fontWeight: 700,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  cursor: isPending ? "wait" : "pointer",
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      )}
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
