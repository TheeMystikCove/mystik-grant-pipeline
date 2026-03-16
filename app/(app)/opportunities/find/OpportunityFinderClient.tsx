"use client";

import { useState } from "react";

interface SearchResult {
  id: string;
  funder_name: string;
  name: string;
  program_area: string | null;
  funder_type: string | null;
  deadline: string | null;
  award_min: number | null;
  award_max: number | null;
  geography: string | null;
  source_url: string | null;
  eligibility_text: string | null;
  notes: string | null;
  status: string;
  verification_status: string;
}

interface Props {
  organizationId: string;
}

const FUNDER_TYPES = [
  { value: "", label: "All Types" },
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "local", label: "Local Government" },
  { value: "private_foundation", label: "Private Foundation" },
  { value: "corporate", label: "Corporate" },
  { value: "community_foundation", label: "Community Foundation" },
  { value: "other", label: "Other" },
];

export function OpportunityFinderClient({ organizationId }: Props) {
  const [keywords, setKeywords] = useState("");
  const [geography, setGeography] = useState("Ohio");
  const [funderType, setFunderType] = useState("");
  const [programArea, setProgramArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/opportunities/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, keywords, geography, funderType, programArea }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.opportunities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "900px" }}>

      {/* Search form */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "1.25rem",
          }}
        >
          Grant Opportunity Scout
        </h2>

        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Keywords */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={labelStyle}>
              Keywords <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(comma-separated)</span>
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="trauma-informed care, youth mental health, emotional regulation, community wellness"
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Row: geography + funder type + program area */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>Geography</label>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                placeholder="Ohio"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>Funder Type</label>
              <select
                value={funderType}
                onChange={(e) => setFunderType(e.target.value)}
                style={inputStyle}
              >
                {FUNDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>Program Area</label>
              <input
                type="text"
                value={programArea}
                onChange={(e) => setProgramArea(e.target.value)}
                placeholder="Mental health, education..."
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "var(--accent-muted)" : "var(--accent)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "6px",
                padding: "0.625rem 1.5rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Searching…" : "Search Opportunities"}
            </button>
          </div>
        </form>
      </section>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "2.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>✦</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Scout is searching for opportunities…
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Results will be saved to your tracker automatically.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            background: "var(--oxblood-muted)",
            border: "1px solid var(--danger)",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
          }}
        >
          <strong style={{ color: "var(--danger)" }}>Search failed:</strong> {error}
        </div>
      )}

      {/* Results */}
      {results !== null && !loading && (
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.875rem",
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {results.length === 0 ? "No results found" : `${results.length} opportunities found`}
            </h2>
            {results.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Saved to tracker · scoring in progress
              </p>
            )}
          </div>

          {results.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "2.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Try broader keywords or a different geography.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {results.map((opp) => (
                <ResultCard key={opp.id} opp={opp} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ opp }: { opp: SearchResult }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "1.125rem 1.25rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {opp.name}
          </p>
          <VerificationBadge status={opp.verification_status} />
        </div>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          {opp.funder_name}
          {opp.funder_type && (
            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
              · {opp.funder_type.replace(/_/g, " ")}
            </span>
          )}
        </p>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          {(opp.award_min != null || opp.award_max != null) && (
            <MetaItem label="Award" value={formatAward(opp.award_min, opp.award_max)} />
          )}
          {opp.deadline && (
            <MetaItem label="Deadline" value={formatDeadline(opp.deadline)} />
          )}
          {opp.geography && (
            <MetaItem label="Geography" value={opp.geography} />
          )}
          {opp.program_area && (
            <MetaItem label="Area" value={opp.program_area} />
          )}
        </div>

        {/* Notes preview */}
        {opp.eligibility_text && (
          <p
            style={{
              marginTop: "0.625rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {opp.eligibility_text}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
        <a
          href={`/opportunities/${opp.id}`}
          style={{
            display: "block",
            background: "var(--accent)",
            color: "var(--text-primary)",
            border: "none",
            borderRadius: "5px",
            padding: "0.4375rem 0.875rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            cursor: "pointer",
            textDecoration: "none",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          View
        </a>
        {opp.source_url && (
          <a
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: "5px",
              padding: "0.4375rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Source ↗
          </a>
        )}
      </div>
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

function VerificationBadge({ status }: { status: string }) {
  const cfg = {
    unverified: { label: "Unverified", color: "var(--text-muted)", bg: "var(--surface-raised)" },
    source_verified: { label: "Source Verified", color: "var(--info)", bg: "#1c2630" },
    manually_reviewed: { label: "Reviewed", color: "var(--success)", bg: "#1e2e1a" },
  }[status] ?? { label: status, color: "var(--text-muted)", bg: "var(--surface-raised)" };

  return (
    <span
      style={{
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: cfg.color,
        background: cfg.bg,
        padding: "2px 6px",
        borderRadius: "3px",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "0.6875rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "0.5625rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
  fontFamily: "Inter, system-ui, sans-serif",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAward(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
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
