"use client";

import { useState, useRef, useEffect } from "react";
import type { Project } from "@/types";

interface MatchedGrant {
  id: string;
  opportunity_id: string;
  match_score: number | null;
  match_rationale: string | null;
  matched_at: string;
  opportunity: {
    id: string;
    name: string;
    funder_name: string;
    program_area: string | null;
    award_min: number | null;
    award_max: number | null;
    deadline: string | null;
    geography: string | null;
    source_url: string | null;
  } | null;
}

interface Props {
  project: Project;
  matchedGrants: MatchedGrant[];
}

type Tab = "brief" | "architect" | "grants";

const STAGE_LABELS: Record<string, string> = {
  intro: "Intro",
  problem: "Problem",
  population: "Population",
  outcomes: "Outcomes",
  budget: "Budget",
  timeline: "Timeline",
  complete: "Complete",
};
const STAGE_ORDER = ["intro", "problem", "population", "outcomes", "budget", "timeline", "complete"];

export function ProjectDetailClient({ project, matchedGrants }: Props) {
  const [tab, setTab] = useState<Tab>("brief");
  const [tags, setTags] = useState<string[]>(project.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(
    (project.conversation_history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content }))
  );
  const [architectStage, setArchitectStage] = useState(project.architect_stage ?? "intro");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [grants, setGrants] = useState<MatchedGrant[]>(matchedGrants);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/architect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json() as { reply?: string; stage?: string; error?: string };
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
        if (data.stage) setArchitectStage(data.stage as typeof architectStage);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function addTag(tag: string) {
    const clean = tag.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    await fetch(`/api/projects/${project.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    fetch(`/api/projects/${project.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  }

  async function findMoreGrants() {
    setMatchLoading(true);
    const res = await fetch(`/api/projects/${project.id}/match-grants`, { method: "POST" });
    const data = await res.json() as { matched?: number };
    if (data.matched && data.matched > 0) {
      // Reload matched grants
      const r = await fetch(`/api/projects/${project.id}/matches`);
      if (r.ok) {
        const d = await r.json() as { matches?: MatchedGrant[] };
        if (d.matches) setGrants(d.matches);
      }
    }
    setMatchLoading(false);
  }

  const stageIndex = STAGE_ORDER.indexOf(architectStage);
  const isComplete = architectStage === "complete";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0", background: "var(--surface-raised)", borderRadius: "6px", padding: "3px", width: "fit-content" }}>
        {([["brief", "Initiative Brief"], ["architect", "Architect"], ["grants", `Matched Grants${grants.length > 0 ? ` (${grants.length})` : ""}`]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.4375rem 1.125rem",
              borderRadius: "4px",
              border: "none",
              background: tab === t ? "var(--surface)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "0.8125rem",
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Brief tab ── */}
      {tab === "brief" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "760px" }}>
          {/* Overview card */}
          <section style={cardStyle}>
            <SectionHeader>Overview</SectionHeader>
            <dl style={dlStyle}>
              {project.program_area && <Field label="Program Area">{project.program_area}</Field>}
              {project.target_population && <Field label="Target Population">{project.target_population}</Field>}
              {project.estimated_budget && <Field label="Estimated Budget">${project.estimated_budget.toLocaleString()}</Field>}
              {project.timeline && <Field label="Timeline">{project.timeline}</Field>}
              <Field label="Architect Stage">
                <span style={{ textTransform: "capitalize" }}>{STAGE_LABELS[architectStage] ?? architectStage}</span>
              </Field>
            </dl>
          </section>

          {/* Tags */}
          <section style={cardStyle}>
            <SectionHeader>Keyword Tags</SectionHeader>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.875rem" }}>
              Tags are used to match this project against open grant opportunities.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.875rem" }}>
              {tags.map((tag) => (
                <span key={tag} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.25rem 0.625rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.75rem", padding: "0 2px", lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addTag(tagInput); setTagInput(""); }} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" style={pillBtnStyle}>Add</button>
            </form>
          </section>

          {/* Description */}
          {project.description && (
            <section style={cardStyle}>
              <SectionHeader>Description</SectionHeader>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{project.description}</p>
            </section>
          )}

          {/* Architect outputs */}
          {(project.problem_statement || project.theory_of_change || project.target_outcomes || project.budget_framework) && (
            <section style={cardStyle}>
              <SectionHeader>Initiative Brief</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {project.problem_statement && (
                  <BriefSection title="Problem Statement">{project.problem_statement}</BriefSection>
                )}
                {project.theory_of_change && (
                  <BriefSection title="Theory of Change">{project.theory_of_change}</BriefSection>
                )}
                {project.target_outcomes && (
                  <BriefSection title="Target Outcomes">{project.target_outcomes}</BriefSection>
                )}
                {project.budget_framework && (
                  <BriefSection title="Budget Framework">{project.budget_framework}</BriefSection>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Architect tab ── */}
      {tab === "architect" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "720px" }}>
          {/* Stage progress */}
          <div style={{ ...cardStyle, padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0", overflow: "hidden" }}>
              {STAGE_ORDER.map((stage, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: done ? "var(--success)" : active ? "var(--accent)" : "var(--surface-raised)",
                      border: `1px solid ${done ? "var(--success)" : active ? "var(--accent)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.625rem",
                      color: done || active ? "#efe8d6" : "var(--text-muted)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: "0.625rem", color: active ? "var(--text-primary)" : "var(--text-muted)", marginLeft: "0.25rem", marginRight: "0.25rem", fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {i < STAGE_ORDER.length - 1 && (
                      <div style={{ flex: 1, height: "1px", background: done ? "var(--success)" : "var(--border)", marginRight: "0.25rem", minWidth: "8px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat messages */}
          <div style={{ ...cardStyle, padding: "1rem", minHeight: "320px", maxHeight: "480px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem", padding: "2rem 0" }}>
                <p style={{ marginBottom: "0.5rem" }}>The Initiative Architect is ready.</p>
                <p>Send a message to begin your conversation.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  maxWidth: "85%",
                  background: msg.role === "user" ? "var(--accent)" : "var(--surface-raised)",
                  color: msg.role === "user" ? "#efe8d6" : "var(--text-secondary)",
                  border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                  borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "12px 12px 12px 2px", padding: "0.625rem 0.875rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Initiative Architect is thinking…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          {!isComplete ? (
            <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your response…"
                disabled={chatLoading}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ ...pillBtnStyle, padding: "0.5625rem 1.25rem" }}>
                Send
              </button>
            </form>
          ) : (
            <div style={{ ...cardStyle, padding: "1rem", background: "var(--success-muted, #1a2a1a)", borderColor: "var(--success)", textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--success)", fontWeight: 600 }}>✓ Initiative brief complete</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>View your completed brief in the Initiative Brief tab.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Matched Grants tab ── */}
      {tab === "grants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "880px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Grants matched to this project based on program area, tags, and priority scoring.
            </p>
            <button onClick={findMoreGrants} disabled={matchLoading} style={{ ...pillBtnStyle, fontSize: "0.75rem" }}>
              {matchLoading ? "Matching…" : "Find More Grants"}
            </button>
          </div>

          {grants.length === 0 ? (
            <div style={{ ...cardStyle, padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>No matched grants yet.</p>
              <p>Click "Find More Grants" to search your saved opportunities for matches.</p>
            </div>
          ) : (
            grants.map((match) => {
              const opp = match.opportunity;
              if (!opp) return null;
              return (
                <div key={match.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{opp.name}</p>
                      {match.match_score != null && match.match_score > 0 && (
                        <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", background: "var(--surface-raised)", border: "1px solid var(--border-accent)", borderRadius: "3px", padding: "2px 6px" }}>
                          ★ {match.match_score}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>{opp.funder_name}</p>
                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" as const }}>
                      {(opp.award_min != null || opp.award_max != null) && (
                        <MetaItem label="Award" value={formatAward(opp.award_min, opp.award_max)} />
                      )}
                      {opp.deadline && <MetaItem label="Deadline" value={formatDeadline(opp.deadline)} />}
                      {opp.geography && <MetaItem label="Geography" value={opp.geography} />}
                    </div>
                    {match.match_rationale && (
                      <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {match.match_rationale}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                    <a href={`/opportunities/${opp.id}`} style={btnSecondaryStyle}>View</a>
                    {opp.source_url && (
                      <a href={opp.source_url} target="_blank" rel="noopener noreferrer" style={btnSecondaryStyle}>Source ↗</a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.375rem" }}>
        {title}
      </p>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{children}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "Georgia, serif", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.625rem", borderBottom: "1px solid var(--border-muted)" }}>
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
      <dt style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{label}</dt>
      <dd style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "right", margin: 0 }}>{children}</dd>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: "0.75rem" }}>
      <span style={{ color: "var(--text-muted)", marginRight: "0.25rem" }}>{label}:</span>
      <span style={{ color: "var(--text-secondary)" }}>{value}</span>
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderTop: "1px solid var(--border-accent)",
  borderRadius: "2px",
  padding: "1.25rem",
};

const dlStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.625rem",
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  width: "100%",
};

const pillBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#efe8d6",
  border: "none",
  borderRadius: "5px",
  padding: "0.4375rem 0.875rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnSecondaryStyle: React.CSSProperties = {
  display: "block",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "0.4375rem 0.875rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
  whiteSpace: "nowrap",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAward(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return "—";
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return deadline;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
