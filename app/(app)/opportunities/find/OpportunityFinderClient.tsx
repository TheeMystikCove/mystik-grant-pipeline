"use client";

import { useState, useMemo, useCallback } from "react";
import { startProposal } from "../[id]/actions";

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
  _score?: number; // populated after fire-and-forget scoring
}

type SortBy = "new" | "deadline" | "amount" | "score";

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
  const [sortBy, setSortBy] = useState<SortBy>("new");
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresReady, setScoresReady] = useState(false);

  // Fetch priority scores for returned opportunity IDs (fire-and-forget after search)
  const fetchScores = useCallback(async (opps: SearchResult[]) => {
    if (opps.length === 0) return;
    setScoresLoading(true);
    const ids = opps.map((o) => o.id).join(",");

    // Poll up to 4 times with 8s intervals — scoring is fire-and-forget on the server
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 8000 : 10000));
      try {
        const res = await fetch(`/api/opportunities/scores?ids=${ids}`);
        if (!res.ok) continue;
        const data = await res.json() as Record<string, number>;
        const scored = Object.keys(data).filter((id) => data[id] > 0);
        if (scored.length === 0) continue;

        setResults((prev) =>
          prev
            ? prev.map((o) => data[o.id] != null ? { ...o, _score: data[o.id] } : o)
            : prev
        );
        setScoresReady(true);
        setScoresLoading(false);
        setSortBy("score"); // auto-sort by Best Match once scores arrive
        return;
      } catch { /* keep polling */ }
    }
    setScoresLoading(false);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keywords.trim() && !programArea.trim()) {
      setError("Enter at least a keyword or program area to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setScoresReady(false);
    setSortBy("new");
    setSearchedFor([keywords, programArea, geography].filter(Boolean).join(" · "));

    try {
      const res = await fetch("/api/opportunities/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, keywords, geography, funderType, programArea }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      const opps: SearchResult[] = json.opportunities ?? [];
      setResults(opps);
      // Start background score polling
      fetchScores(opps);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Sorted results based on active sort pill
  const sortedResults = useMemo(() => {
    if (!results) return [];
    const arr = [...results];
    if (sortBy === "deadline") {
      return arr.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    }
    if (sortBy === "amount") {
      return arr.sort((a, b) => (b.award_max ?? b.award_min ?? 0) - (a.award_max ?? a.award_min ?? 0));
    }
    if (sortBy === "score") {
      return arr.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    }
    return arr; // "new" — insertion order
  }, [results, sortBy]);

  const federalCount = results?.filter((r) => r.verification_status === "source_verified").length ?? 0;
  const webCount = results?.filter((r) => r.verification_status === "web_verified").length ?? 0;
  const foundationCount = results ? results.length - federalCount - webCount : 0;

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
            Searching Grants.gov · community foundations · state portals · private funders…
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Three sources running in parallel. Results are saved and scored automatically.
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
          {/* Results header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap" as const, gap: "0.5rem" }}>
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
                    <><span style={{ color: "var(--info)" }}>{federalCount} federal</span>{webCount > 0 || foundationCount > 0 ? " · " : ""}</>
                  )}
                  {webCount > 0 && (
                    <><span style={{ color: "var(--success)" }}>{webCount} web-sourced</span>{foundationCount > 0 ? " · " : ""}</>
                  )}
                  {foundationCount > 0 && (
                    <span style={{ color: "var(--warning)" }}>{foundationCount} AI-suggested</span>
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

          {/* Sort pills */}
          {results.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" as const }}>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", alignSelf: "center", marginRight: "0.25rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Sort:
              </span>
              {(["new", "deadline", "amount", "score"] as SortBy[]).map((s) => {
                const isActive = sortBy === s;
                const isScore = s === "score";
                const disabled = isScore && !scoresReady;
                const label =
                  s === "new" ? "New" :
                  s === "deadline" ? "Deadline ↑" :
                  s === "amount" ? "Amount ↓" :
                  scoresLoading ? "Best Match…" : "Best Match ★";

                return (
                  <button
                    key={s}
                    onClick={() => !disabled && setSortBy(s)}
                    disabled={disabled}
                    style={{
                      background: isActive ? "var(--accent)" : "var(--surface-raised)",
                      color: isActive ? "#efe8d6" : disabled ? "var(--text-muted)" : "var(--text-secondary)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "20px",
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {isScore && scoresLoading && <MiniSpinner />}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {results.length === 0 ? (
            <div style={{ ...cardStyle, padding: "2.5rem", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "0.875rem" }}>
              <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>No matches found for these search terms.</p>
              <p>Try a broader program area (e.g. "Health" instead of "Trauma-informed peer support") or remove the geography filter.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {sortedResults.map((opp) => (
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
    <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" as const }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {opp.name}
          </p>
          <SourceBadge verificationStatus={opp.verification_status} funderType={opp.funder_type} />
          {opp._score != null && opp._score > 0 && (
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", background: "var(--surface-raised)", border: "1px solid var(--border-accent)", borderRadius: "3px", padding: "2px 6px", letterSpacing: "0.04em" }}>
              ★ {opp._score}
            </span>
          )}
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
        <form action={startProposal}>
          <input type="hidden" name="opportunity_id" value={opp.id} />
          <button type="submit" style={{ ...btnPrimaryStyle, width: "100%", cursor: "pointer", border: "none" }}>
            Start Proposal
          </button>
        </form>
        <a href={`/opportunities/${opp.id}`} style={btnSecondaryStyle}>
          View
        </a>
        {opp.source_url && (
          <a href={opp.source_url} target="_blank" rel="noopener noreferrer" style={btnSecondaryStyle}>
            {opp.verification_status === "source_verified" ? "Grants.gov ↗" : "Source ↗"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ verificationStatus, funderType }: { verificationStatus: string; funderType: string | null }) {
  if (verificationStatus === "source_verified") {
    return (
      <span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--info)", background: "#1c2630", padding: "2px 6px", borderRadius: "3px" }}>
        Grants.gov Live
      </span>
    );
  }
  if (verificationStatus === "web_verified") {
    const label =
      funderType === "community_foundation" ? "Community Fdn" :
      funderType === "state" ? "State Gov" :
      funderType === "local" ? "Local Gov" :
      funderType === "corporate" ? "Corporate" : "Web Sourced";
    return (
      <span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--success)", background: "#1a2a1a", padding: "2px 6px", borderRadius: "3px" }}>
        {label} · Web
      </span>
    );
  }
  const label =
    funderType === "state" ? "State" :
    funderType === "community_foundation" ? "Community Fdn" :
    funderType === "corporate" ? "Corporate" : "Foundation";
  return (
    <span style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--warning)", background: "#2a2318", padding: "2px 6px", borderRadius: "3px" }}>
      {label} · AI
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

function MiniSpinner() {
  return (
    <>
      <div style={{ width: "10px", height: "10px", border: "1.5px solid var(--border)", borderTopColor: "var(--text-muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
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
