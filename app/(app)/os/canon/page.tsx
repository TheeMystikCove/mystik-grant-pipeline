"use client"

import { useState, useEffect } from "react"
import { Topbar } from "@/components/layout/topbar"

type CanonTier = "TIER_0" | "TIER_1" | "TIER_2" | "TIER_3"
type CanonDomain = "CORE" | "ACADEMY" | "HARBOR" | "STUDIOS" | "MARKET" | "OPS" | "NEXIS"
type CanonStatus = "ACTIVE" | "DRAFT" | "ARCHIVED" | "NEEDS_REVIEW"

interface CanonDoc {
  id: string
  title: string
  slug: string
  description?: string
  sourceType: string
  fileName: string
  tier: CanonTier
  domain: CanonDomain
  category: string
  tags: string[]
  status: CanonStatus
  version: string
  sensitivity: string
  visibility: string
  authorityWeight: number
  chunkCount?: number
  processed: boolean
  reviewNotes?: string
  createdAt: string
  updatedAt: string
}

const TIER_LABELS: Record<CanonTier, string> = {
  TIER_0: "T0 · Primordial",
  TIER_1: "T1 · Framework",
  TIER_2: "T2 · Canon",
  TIER_3: "T3 · Operational",
}

const TIER_COLORS: Record<CanonTier, string> = {
  TIER_0: "var(--accent)",
  TIER_1: "var(--info)",
  TIER_2: "var(--success)",
  TIER_3: "var(--text-muted)",
}

const STATUS_COLORS: Record<CanonStatus, string> = {
  ACTIVE: "var(--success)",
  DRAFT: "var(--warning)",
  ARCHIVED: "var(--text-faint)",
  NEEDS_REVIEW: "var(--danger)",
}

export default function CanonRegistryPage() {
  const [docs, setDocs] = useState<CanonDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState<CanonTier | "ALL">("ALL")
  const [filterDomain, setFilterDomain] = useState<CanonDomain | "ALL">("ALL")
  const [filterStatus, setFilterStatus] = useState<CanonStatus | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CanonDoc | null>(null)

  useEffect(() => { fetchDocs() }, [])

  async function fetchDocs() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/os/canon")
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setDocs(data.docs ?? [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = docs.filter((d) => {
    if (filterTier !== "ALL" && d.tier !== filterTier) return false
    if (filterDomain !== "ALL" && d.domain !== filterDomain) return false
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.title.toLowerCase().includes(q) ||
        d.slug.includes(q) ||
        d.tags.some((t) => t.includes(q))
      )
    }
    return true
  })

  const stats = {
    total: docs.length,
    active: docs.filter((d) => d.status === "ACTIVE").length,
    processed: docs.filter((d) => d.processed).length,
    needsReview: docs.filter((d) => d.status === "NEEDS_REVIEW").length,
    totalChunks: docs.reduce((s, d) => s + (d.chunkCount ?? 0), 0),
  }

  return (
    <>
      <Topbar title="Canon Registry" subtitle="NEXIS Knowledge Layer" />

      <main style={{ flex: 1, padding: "1.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Documents", value: stats.total, icon: "◎", color: "var(--info)" },
            { label: "Active", value: stats.active, icon: "◆", color: "var(--success)" },
            { label: "Processed", value: stats.processed, icon: "◈", color: "var(--accent)" },
            { label: "Needs Review", value: stats.needsReview, icon: "◇", color: stats.needsReview > 0 ? "var(--danger)" : "var(--text-faint)" },
            { label: "Total Chunks", value: stats.totalChunks, icon: "◉", color: "var(--text-secondary)" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "1px solid var(--border-accent)",
                borderRadius: "2px",
                padding: "1.125rem 1.375rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span aria-hidden style={{ position: "absolute", top: "0.625rem", right: "0.75rem", fontSize: "0.4375rem", color: s.color, opacity: 0.3, letterSpacing: "0.1em" }}>
                {s.icon}
              </span>
              <p style={{ fontSize: "0.5625rem", color: "var(--text-muted)", marginBottom: "0.5rem", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "Inter, system-ui, sans-serif" }}>
                {s.label}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search title, slug, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={filterInputStyle}
          />
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value as CanonTier | "ALL")} style={filterInputStyle}>
            <option value="ALL">All Tiers</option>
            {(["TIER_0", "TIER_1", "TIER_2", "TIER_3"] as CanonTier[]).map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
          <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value as CanonDomain | "ALL")} style={filterInputStyle}>
            <option value="ALL">All Domains</option>
            {(["CORE","ACADEMY","HARBOR","STUDIOS","MARKET","OPS","NEXIS"] as CanonDomain[]).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as CanonStatus | "ALL")} style={filterInputStyle}>
            <option value="ALL">All Statuses</option>
            {(["ACTIVE","DRAFT","NEEDS_REVIEW","ARCHIVED"] as CanonStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={fetchDocs} style={{ ...filterInputStyle, cursor: "pointer", color: "var(--accent)", borderColor: "var(--border-accent)", background: "var(--surface-accent)" }}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "var(--danger-surface, #2d0f0f)", border: "1px solid var(--danger)", borderRadius: "2px", color: "var(--danger)", fontSize: "0.8125rem", fontFamily: "Inter, system-ui, sans-serif" }}>
            Error: {error}
          </div>
        )}

        {/* Main layout */}
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>

          {/* Document list */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {loading ? (
              <p style={{ color: "var(--text-faint)", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.875rem", padding: "2rem 0" }}>
                Loading registry…
              </p>
            ) : filtered.length === 0 ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "1px solid var(--border-accent)", borderRadius: "2px", padding: "2.5rem 1.375rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-faint)", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                  No canon documents found.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.6875rem", fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "0.02em" }}>
                  Drop PDFs into <code style={{ background: "var(--surface-raised)", padding: "0 4px" }}>knowledge/canon/</code> and run <code style={{ background: "var(--surface-raised)", padding: "0 4px" }}>npm run canon:ingest</code>
                </p>
              </div>
            ) : (
              filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${selected?.id === doc.id ? "var(--border-accent)" : "var(--border)"}`,
                    borderTop: `1px solid ${selected?.id === doc.id ? "var(--accent)" : "var(--border-accent)"}`,
                    borderRadius: "2px",
                    padding: "0.875rem 1.375rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                    transition: "border-color 0.12s",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Badges row */}
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                      <Chip label={TIER_LABELS[doc.tier]} color={TIER_COLORS[doc.tier]} />
                      <Chip label={doc.domain} color="var(--text-secondary)" />
                      <Chip label={doc.status} color={STATUS_COLORS[doc.status]} />
                      {!doc.processed && <Chip label="NOT PROCESSED" color="var(--warning)" />}
                    </div>

                    <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.title}
                    </p>
                    <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}>
                      {doc.slug}
                    </p>

                    {doc.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        {doc.tags.map((tag) => (
                          <span key={tag} style={{ fontSize: "0.5625rem", color: "var(--text-faint)", background: "var(--surface-raised)", border: "1px solid var(--border-muted)", borderRadius: "2px", padding: "1px 6px", letterSpacing: "0.04em", fontFamily: "Inter, system-ui, sans-serif" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
                      {doc.chunkCount ?? 0}
                    </p>
                    <p style={{ fontSize: "0.5625rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "2px", fontFamily: "Inter, system-ui, sans-serif" }}>
                      chunks
                    </p>
                    <p style={{ fontSize: "0.5625rem", color: "var(--text-faint)", marginTop: "4px", fontFamily: "Inter, system-ui, sans-serif" }}>
                      w:{doc.authorityWeight}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ width: "280px", flexShrink: 0, position: "sticky", top: "1.75rem" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border-accent)", borderTop: "1px solid var(--accent)", borderRadius: "2px", padding: "1.125rem 1.375rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Document Details
                  </h2>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>
                    ✕
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Slug" value={selected.slug} mono />
                  <DetailField label="Tier" value={selected.tier} />
                  <DetailField label="Domain" value={selected.domain} />
                  <DetailField label="Category" value={selected.category} />
                  <DetailField label="Status" value={selected.status} />
                  <DetailField label="Version" value={selected.version} />
                  <DetailField label="Sensitivity" value={selected.sensitivity} />
                  <DetailField label="Visibility" value={selected.visibility} />
                  <DetailField label="Authority Weight" value={String(selected.authorityWeight)} />
                  <DetailField label="Chunks" value={String(selected.chunkCount ?? 0)} />
                  <DetailField label="Processed" value={selected.processed ? "Yes" : "No"} />
                  <DetailField label="File" value={selected.fileName} mono />
                  {selected.description && (
                    <div>
                      <p style={detailLabelStyle}>Description</p>
                      <p style={{ ...detailValueStyle, lineHeight: 1.5 }}>{selected.description}</p>
                    </div>
                  )}
                  {selected.reviewNotes && (
                    <div>
                      <p style={{ ...detailLabelStyle, color: "var(--warning)" }}>Review Notes</p>
                      <p style={{ ...detailValueStyle, color: "var(--warning)", lineHeight: 1.5 }}>{selected.reviewNotes}</p>
                    </div>
                  )}
                  <div style={{ paddingTop: "0.625rem", borderTop: "1px solid var(--border-muted)" }}>
                    <p style={detailLabelStyle}>Updated</p>
                    <p style={detailValueStyle}>{new Date(selected.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ingestion guide */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "1px solid var(--border-accent)", borderRadius: "2px", padding: "1.125rem 1.375rem" }}>
          <p style={{ fontSize: "0.5625rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "Inter, system-ui, sans-serif", marginBottom: "0.5rem" }}>
            Ingestion Guide
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {[
              "1. Drop PDF files into the correct tier folder in NEXIS_AI_CORE/knowledge/canon/",
              "2. Run npm run canon:ingest from NEXIS_AI_CORE",
              "3. Refresh this page to see the updated registry",
            ].map((step) => (
              <p key={step} style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}>
                {step}
              </p>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "1px 6px",
      borderRadius: "2px",
      fontSize: "0.5625rem",
      fontWeight: 700,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      color,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {label}
    </span>
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={detailLabelStyle}>{label}</p>
      <p style={{ ...detailValueStyle, fontFamily: mono ? "monospace" : "Inter, system-ui, sans-serif", wordBreak: "break-all" }}>{value}</p>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const filterInputStyle: React.CSSProperties = {
  padding: "0.4375rem 0.75rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  color: "var(--text-primary)",
  fontSize: "0.75rem",
  fontFamily: "Inter, system-ui, sans-serif",
}

const detailLabelStyle: React.CSSProperties = {
  fontSize: "0.5625rem",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  fontFamily: "Inter, system-ui, sans-serif",
  marginBottom: "2px",
}

const detailValueStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  fontFamily: "Inter, system-ui, sans-serif",
}
