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
  { value: "",                     label: "All Types (Federal + Foundations)" },
  { value: "federal",              label: "Federal Only (Grants.gov live)" },
  { value: "private_foundation",   label: "Private Foundation" },
  { value: "community_foundation", label: "Community Foundation" },
  { value: "state",                label: "State Government" },
  { value: "corporate",            label: "Corporate / CSR" },
  { value: "local",                label: "Local Government" },
  { value: "other",                label: "Other" },
];

const PROGRAM_AREA_SUGGESTIONS = [
  "Mental health",
  "Behavioral health",
  "Substance use disorder",
  "Youth development",
  "Education",
  "Workforce development",
  "Housing",
  "Veterans services",
  "Community development",
  "Arts and culture",
  "History and preservation",
  "Public health",
];

export function OpportunityFinderClient({ organizationId }: Props) {
  const [keywords, setKeywords] = useState("");
  const [geography, setGeography] = useState("Ohio");
  const [funderType, setFunderType] = useState("");
  const [programArea, setProgramArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState<string>("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keywords.trim() && !programArea.trim()) {
      setError("Enter at least a keyword or program area to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchedFor([keywords, programArea, geography].filter(Boolean).join(" · "));

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

  const federalCount = results?.filter((r) => r.verification_status === "source_verified").length ?? 0;
  const foundationCount = results ? results.length - federalCount : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "940px" }}>

      {/* Search form */}
      <section style={cardStyle}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Grant Opportunity Search
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Federal grants are pulled live from{" "}
            <strong style={{ color: "var(--text-secondary)" }}>Grants.gov</strong> in real time.
            Foundations and state funders are surfaced by AI from known active programs.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>Program Area <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                value={programArea}
                onChange={(e) => setProgramArea(e.target.value)}
                placeholder="e.g. Mental health, Veterans services, Education"
                style={inputStyle}
                list="program-area-suggestions"
              />
              <datalist id="program-area-suggestions">
                {PROGRAM_AREA_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>
                Keywords{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(comma-separated)</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="trauma-informed, oral history, community wellness"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={labelStyle}>Geography</label>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                placeholder="Ohio, National, Northeast Ohio…"
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
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem" }}>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
              Searches take 20–45 seconds
            </p>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "var(--accent-muted)" : "var(--accent)",
                color: "#efe8d6",
                border: "none",
                borderRadius: "6px",
                padding: "0.625rem 1.5rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Searching…" : "Search Opportunities"}
            </button>
          </div>
        </form>
      </section>

      {/* Loading state */}
      {loading && (
        <div style={{ ...cardStyle, padding: "2.5rem", textAlign: "center" as const }}>
          <Spinner />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "1rem", marginBottom: "0.25rem" }}>
            Searching Grants.gov + foundation database…
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Federal results load first, then foundations. Results are saved automatically.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ background: "var(--oxblood-muted)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "1rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          <strong style={{ color: "var(--danger)" }}>Search failed:</strong> {error}
        </div>
      )}

      {/* Results */}
      {results !== null && !loading && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem", flexWrap: "wrap" as const, gap: "0.5rem" }}>
            <div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                {results.length === 0 ? "No results found" : `${results.length} opportunities found`}
              </h2>
              {results.length > 0 && (
                <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                  {searchedFor && (
                    <><span style={{ color: "var(--text-secondary)" }}>{searchedFor}</span> · </>
                  )}
                  {federalCount > 0 && (
                    <><span style={{ color: "var(--info)" }}>{federalCount} federal (live)</span>{foundationCount > 0 ? " · " : ""}</>
                  )}
                  {foundationCount > 0 && (
                    <span style={{ color: "var(--warning)" }}>{foundationCount} foundation/state (AI — verify before applying)</span>
                  )}
                </p>
              )}
            </div>
            {results.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Saved to tracker · scoring in progress
              </p>
            )}
          </div>

          {results.length === 0 ? (
            <div style={{ ...cardStyle, padding: "2.5rem", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "0.875rem" }}>
              <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>No matches found for these search terms.</p>
              <p>Try a broader program area (e.g. "Health" instead of "Trauma-informed peer support") or remove the geography filter.</p>
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
  const isLive = opp.verification_status === "source_verified";

  return (
    <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" as const }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {opp.name}
          </p>
          <SourceBadge isLive={isLive} funderType={opp.funder_type} />
        </div>

        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          {opp.funder_name}
          {opp.funder_type && (
            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
              · {opp.funder_type.replace(/_/g, " ")}
            </span>
          )}
        </p>

        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" as const }}>
          {(opp.award_min != null || opp.award_max != null) && (
            <MetaItem label="Award" value={formatAward(opp.award_min, opp.award_max)} />
          )}
          {opp.deadline && (
            <MetaItem
              label="Deadline"
              value={formatDeadline(opp.deadline)}
              urgent={isDeadlineSoon(opp.deadline)}
            />
          )}
          {opp.geography && <MetaItem label="Geography" value={opp.geography} />}
          {opp.program_area && <MetaItem label="Area" value={opp.program_area} />}
        </div>

        {(opp.eligibility_text || opp.notes) && (
          <p style={{ marginTop: "0.625rem", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {opp.eligibility_text || opp.notes}
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
        <a href={`/opportunities/${opp.id}`} style={btnPrimaryStyle}>
          View
        </a>
        {opp.source_url && (
          <a href={opp.source_url} target="_blank" rel="noopener noreferrer" style={btnSecondaryStyle}>
            {isLive ? "Grants.gov ↗" : "Source ↗"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ isLive, funderType }: { isLive: boolean; funderType: string | null }) {
  if (isLive) {
    return (
      <span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--info)", background: "#1c2630", padding: "2px 6px", borderRadius: "3px" }}>
        Grants.gov Live
      </span>
    );
  }
  const label =
    funderType === "state" ? "State" :
    funderType === "community_foundation" ? "Community Fdn" :
    funderType === "corporate" ? "Corporate" : "Foundation";
  return (
    <span style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--warning)", background: "#2a2318", padding: "2px 6px", borderRadius: "3px" }}>
      {label} · Verify
    </span>
  );
}

function MetaItem({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
  return (
    <span style={{ fontSize: "0.75rem" }}>
      <span style={{ color: "var(--text-muted)", marginRight: "0.25rem" }}>{label}:</span>
      <span style={{ color: urgent ? "var(--warning)" : "var(--text-secondary)", fontWeight: urgent ? 600 : 400 }}>
        {value}
      </span>
    </span>
  );
}

function Spinner() {
  return (
    <>
      <div style={{ width: "24px", height: "24px", border: "2px solid var(--border-accent)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "1.25rem",
};

const labelStyle: React.CSSProperties = {
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
  width: "100%",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "block",
  background: "var(--accent)",
  color: "#efe8d6",
  borderRadius: "5px",
  padding: "0.4375rem 0.875rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  textDecoration: "none",
  textAlign: "center",
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

function isDeadlineSoon(deadline: string): boolean {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days >= 0 && days <= 30;
}
