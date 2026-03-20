"use client"

import { useState, useEffect } from "react"

// ── Types (local mirrors of canon-types to avoid package import in Next.js) ──

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

// ── Colors ───────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<CanonTier, string> = {
  TIER_0: "bg-purple-900 text-purple-100",
  TIER_1: "bg-indigo-800 text-indigo-100",
  TIER_2: "bg-slate-700 text-slate-100",
  TIER_3: "bg-slate-600 text-slate-200",
}

const STATUS_COLORS: Record<CanonStatus, string> = {
  ACTIVE: "bg-emerald-900 text-emerald-200",
  DRAFT: "bg-yellow-900 text-yellow-200",
  ARCHIVED: "bg-slate-800 text-slate-400",
  NEEDS_REVIEW: "bg-red-900 text-red-200",
}

const TIER_LABELS: Record<CanonTier, string> = {
  TIER_0: "T0 — Primordial",
  TIER_1: "T1 — Framework",
  TIER_2: "T2 — Canon",
  TIER_3: "T3 — Operational",
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CanonAdminPage() {
  const [docs, setDocs] = useState<CanonDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState<CanonTier | "ALL">("ALL")
  const [filterDomain, setFilterDomain] = useState<CanonDomain | "ALL">("ALL")
  const [filterStatus, setFilterStatus] = useState<CanonStatus | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<CanonDoc | null>(null)

  useEffect(() => {
    fetchDocs()
  }, [])

  async function fetchDocs() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/os/canon")
      if (!res.ok) throw new Error(`Failed to fetch canon registry: ${res.status}`)
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        d.title.toLowerCase().includes(q) ||
        d.slug.includes(q) ||
        d.category.includes(q) ||
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
    totalChunks: docs.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0),
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">
            K
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Canon Knowledge Registry</h1>
        </div>
        <p className="text-slate-400 text-sm">
          NEXIS AI.OS — Active canon documents, processing status, and chunk counts
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Docs", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Processed", value: stats.processed },
          { label: "Needs Review", value: stats.needsReview },
          { label: "Total Chunks", value: stats.totalChunks.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search title, slug, tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-64"
        />

        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value as CanonTier | "ALL")}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="ALL">All Tiers</option>
          {(["TIER_0", "TIER_1", "TIER_2", "TIER_3"] as CanonTier[]).map((t) => (
            <option key={t} value={t}>{TIER_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value as CanonDomain | "ALL")}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="ALL">All Domains</option>
          {(["CORE", "ACADEMY", "HARBOR", "STUDIOS", "MARKET", "OPS", "NEXIS"] as CanonDomain[]).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CanonStatus | "ALL")}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="ALL">All Statuses</option>
          {(["ACTIVE", "DRAFT", "NEEDS_REVIEW", "ARCHIVED"] as CanonStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={fetchDocs}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white ml-auto"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Layout: table + detail panel */}
      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-slate-500 text-sm py-8 text-center">Loading registry...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <div className="text-slate-400 text-sm mb-2">No canon documents found</div>
              <div className="text-slate-600 text-xs">
                Run <code className="bg-slate-800 px-1 rounded">npm run canon:ingest</code> to ingest PDFs from the knowledge/canon/ folders
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
                  className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
                    selected?.id === doc.id
                      ? "border-purple-600"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[doc.tier]}`}>
                          {doc.tier}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{doc.domain}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>
                          {doc.status}
                        </span>
                        {!doc.processed && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-950 text-orange-300">
                            NOT PROCESSED
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-white truncate">{doc.title}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{doc.slug}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white">
                        {doc.chunkCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500">chunks</div>
                      <div className="text-xs text-slate-600 mt-1">
                        w: {doc.authorityWeight}
                      </div>
                    </div>
                  </div>

                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0">
            <div className="bg-slate-900 border border-purple-800 rounded-lg p-4 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white text-sm">Document Details</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <Field label="ID" value={selected.id} mono />
                <Field label="Title" value={selected.title} />
                <Field label="Slug" value={selected.slug} mono />
                <Field label="Tier" value={selected.tier} />
                <Field label="Domain" value={selected.domain} />
                <Field label="Category" value={selected.category} />
                <Field label="Status" value={selected.status} />
                <Field label="Version" value={selected.version} />
                <Field label="Sensitivity" value={selected.sensitivity} />
                <Field label="Visibility" value={selected.visibility} />
                <Field label="Authority Weight" value={String(selected.authorityWeight)} />
                <Field label="Chunks" value={String(selected.chunkCount ?? 0)} />
                <Field label="Processed" value={selected.processed ? "Yes" : "No"} />
                <Field label="File" value={selected.fileName} mono />
                {selected.description && (
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Description</div>
                    <div className="text-slate-300 text-xs leading-relaxed">{selected.description}</div>
                  </div>
                )}
                {selected.reviewNotes && (
                  <div>
                    <div className="text-orange-400 text-xs mb-1">Review Notes</div>
                    <div className="text-orange-300 text-xs leading-relaxed">{selected.reviewNotes}</div>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-slate-500 text-xs">Updated</div>
                  <div className="text-slate-400 text-xs">
                    {new Date(selected.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingestion guide */}
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="text-slate-400 text-xs font-medium mb-2">How to ingest canon PDFs</div>
        <div className="text-slate-600 text-xs space-y-1">
          <div>1. Drop PDF files into the appropriate tier folder in <code className="bg-slate-800 px-1 rounded">NEXIS_AI_CORE/knowledge/canon/</code></div>
          <div>2. Run <code className="bg-slate-800 px-1 rounded">npm run canon:ingest</code> from NEXIS_AI_CORE</div>
          <div>3. Refresh this page to see updated registry</div>
          <div className="pt-1 text-slate-700">
            Priority folders: tier-1-frameworks/ (Magik System) → tier-2-canons/ (Academy Canon, Spiritual Gifts)
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-slate-500 text-xs">{label}</div>
      <div className={`text-slate-300 text-xs mt-0.5 break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  )
}
