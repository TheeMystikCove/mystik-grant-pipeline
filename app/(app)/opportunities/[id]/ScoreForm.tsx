"use client";

import { useState, useTransition } from "react";
import { scoreOpportunity } from "./actions";

const DIMENSIONS = [
  { key: "strategic_fit", label: "Strategic Fit", weight: "40%", hint: "How well does this align with your mission and priorities?" },
  { key: "eligibility_confidence", label: "Eligibility Confidence", weight: "25%", hint: "How confident are you that your org qualifies?" },
  { key: "internal_readiness", label: "Internal Readiness", weight: "15%", hint: "Do you have the capacity and data to apply?" },
  { key: "value_vs_effort", label: "Award Value vs Effort", weight: "10%", hint: "Is the award size worth the application effort?" },
  { key: "deadline_urgency", label: "Deadline Urgency", weight: "10%", hint: "How pressing is the timeline?" },
] as const;

const WEIGHTS = { strategic_fit: 0.40, eligibility_confidence: 0.25, internal_readiness: 0.15, value_vs_effort: 0.10, deadline_urgency: 0.10 };

function calcScore(vals: Record<string, number>) {
  const total = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + (vals[k] ?? 5) * w * 10, 0);
  return Math.round(total * 10) / 10;
}

function scoreColor(s: number) {
  if (s >= 70) return "var(--success)";
  if (s >= 45) return "var(--warning)";
  return "var(--danger)";
}

function scoreLabel(s: number) {
  if (s >= 70) return "Strong";
  if (s >= 45) return "Moderate";
  return "Weak";
}

export function ScoreForm({ opportunityId, existing }: { opportunityId: string; existing?: { total_score: number; label: string; strategic_fit_score: number; eligibility_score: number; readiness_score: number; award_value_score: number; urgency_score: number; rationale?: string | null } | null }) {
  const [editing, setEditing] = useState(!existing);
  const [vals, setVals] = useState<Record<string, number>>({
    strategic_fit: existing ? Math.round(existing.strategic_fit_score / 4) : 5,
    eligibility_confidence: existing ? Math.round(existing.eligibility_score / 2.5) : 5,
    internal_readiness: existing ? Math.round(existing.readiness_score / 1.5) : 5,
    value_vs_effort: existing ? Math.round(existing.award_value_score) : 5,
    deadline_urgency: existing ? Math.round(existing.urgency_score) : 5,
  });
  const [feedback, setFeedback] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const liveScore = calcScore(vals);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await scoreOpportunity(fd);
        setFeedback(result);
        if (result.success) setEditing(false);
      } catch (err) {
        setFeedback({ error: err instanceof Error ? err.message : "Failed to save score." });
      }
    });
  }

  if (!editing && existing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "2.5rem", fontWeight: 700, color: scoreColor(existing.total_score), lineHeight: 1 }}>
            {existing.total_score}
          </span>
          <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ 100</span>
          <span style={{ marginLeft: "auto", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {existing.label}
          </span>
        </div>

        {/* Score bar */}
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${existing.total_score}%`, background: scoreColor(existing.total_score), borderRadius: "3px", transition: "width 0.3s" }} />
        </div>

        <dl style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
          {[
            { label: "Strategic Fit (40%)", val: existing.strategic_fit_score },
            { label: "Eligibility (25%)", val: existing.eligibility_score },
            { label: "Readiness (15%)", val: existing.readiness_score },
            { label: "Award Value (10%)", val: existing.award_value_score },
            { label: "Deadline Urgency (10%)", val: existing.urgency_score },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <dt style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</dt>
              <dd style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>{val}</dd>
            </div>
          ))}
        </dl>

        {existing.rationale && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "0.25rem", fontStyle: "italic" }}>
            {existing.rationale}
          </p>
        )}

        <button
          onClick={() => { setEditing(true); setFeedback(null); }}
          style={{ alignSelf: "flex-start", marginTop: "0.25rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "2px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}
        >
          Rescore
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <input type="hidden" name="opportunity_id" value={opportunityId} />

      {/* Live score preview */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--surface-deep)", borderRadius: "2px", border: "1px solid var(--border)" }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 700, color: scoreColor(liveScore), lineHeight: 1 }}>{liveScore}</span>
        <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>/ 100</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: scoreColor(liveScore), marginLeft: "0.25rem" }}>{scoreLabel(liveScore)}</span>
        <div style={{ flex: 1, height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden", marginLeft: "0.5rem" }}>
          <div style={{ height: "100%", width: `${liveScore}%`, background: scoreColor(liveScore), borderRadius: "2px", transition: "width 0.15s" }} />
        </div>
      </div>

      {DIMENSIONS.map(({ key, label, weight, hint }) => (
        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor={key} style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {label} <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>({weight})</span>
            </label>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)", minWidth: "1.5rem", textAlign: "right" }}>
              {vals[key]}
            </span>
          </div>
          <input
            id={key}
            name={key}
            type="range"
            min={1}
            max={10}
            step={1}
            value={vals[key]}
            onChange={(e) => setVals((v) => ({ ...v, [key]: Number(e.target.value) }))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
          <p style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: "-0.125rem" }}>{hint}</p>
        </div>
      ))}

      {/* Rationale */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="rationale" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Rationale <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span>
        </label>
        <textarea
          id="rationale"
          name="rationale"
          rows={2}
          placeholder="Brief notes on why you scored it this way…"
          defaultValue={existing?.rationale ?? ""}
          style={{ background: "var(--surface-deep)", border: "1px solid var(--border)", borderRadius: "2px", padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "var(--text-primary)", resize: "vertical", width: "100%", boxSizing: "border-box" }}
        />
      </div>

      {feedback?.error && (
        <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{feedback.error}</p>
      )}

      <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{ padding: "0.5rem 1.25rem", background: "var(--accent)", color: "#efe8d6", border: "none", borderRadius: "2px", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", cursor: isPending ? "wait" : "pointer", opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? "Saving…" : "Save Score"}
        </button>
        {existing && (
          <button type="button" onClick={() => { setEditing(false); setFeedback(null); }} style={{ background: "transparent", border: "none", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
