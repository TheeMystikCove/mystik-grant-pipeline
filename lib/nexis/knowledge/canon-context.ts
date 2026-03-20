/**
 * NEXIS Canon Context Fetcher
 *
 * Queries nexis_canon_chunks in NEXIS OS Supabase and formats the most
 * relevant chunks as a system-prompt context block for agent injection.
 *
 * Called by the AI gateway before every request — gracefully no-ops if
 * no relevant chunks are found or the knowledge layer is unavailable.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { NexisAIRequest, NexisTaskType } from "../schemas/ai-request"

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHUNKS = 3
const MAX_CONTEXT_CHARS = 3200

// Task types that meaningfully benefit from canon grounding
const CANON_ELIGIBLE_TASKS: Set<NexisTaskType> = new Set([
  "knowledge_lookup",
  "proposal",
  "architecture",
  "research",
  "content",
  "general",
  "workflow",
  "meeting_recap",
])

// English stopwords to strip before building FTS query
const STOPWORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","as","is","was","are","were","be","been","being","have",
  "has","had","do","does","did","will","would","could","should","may",
  "might","shall","can","need","dare","ought","used","that","this",
  "these","those","i","you","he","she","it","we","they","what","which",
  "who","how","when","where","why","all","each","every","both","either",
  "not","no","nor","so","yet","both","about","above","after","before",
  "into","through","during","between","such","than","then","just",
  "because","while","although","though","me","him","her","us","them",
  "my","your","his","its","our","their","mine","yours","hers","ours",
])

// ── Supabase client (NEXIS OS project) ───────────────────────────────────────

let _nexisClient: SupabaseClient | null = null

function getNexisClient(): SupabaseClient | null {
  if (_nexisClient) return _nexisClient
  const url = process.env.NEXIS_SUPABASE_URL
  const key = process.env.NEXIS_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _nexisClient = createClient(url, key)
  return _nexisClient
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CanonContextResult {
  /** Formatted block ready to append to system prompt. Empty string if skipped. */
  systemPromptBlock: string
  /** Number of chunks injected */
  chunkCount: number
  /** True if the canon layer was skipped (unavailable, ineligible, or no results) */
  skipped: boolean
}

interface CanonChunkRow {
  chunk_id: string
  title: string
  tier: string
  domain: string
  section: string | null
  text: string
  authority_weight: number
}

// ── Keyword extraction ────────────────────────────────────────────────────────

/**
 * Extracts meaningful keywords from a prompt for Postgres websearch FTS.
 * Returns a websearch-format string like `magik | elemental | chakra`.
 */
function extractKeywords(prompt: string, limit = 8): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const unique: string[] = []
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); unique.push(w) }
    if (unique.length >= limit) break
  }

  return unique.join(" | ")
}

// ── Main fetch function ───────────────────────────────────────────────────────

/**
 * Fetches the most relevant canon chunks for a given NEXIS request.
 * Returns a formatted system prompt block, or an empty skipped result.
 */
export async function fetchCanonContext(
  request: NexisAIRequest
): Promise<CanonContextResult> {
  const SKIPPED: CanonContextResult = { systemPromptBlock: "", chunkCount: 0, skipped: true }

  // ── Fast paths ────────────────────────────────────────────────────────
  if (!CANON_ELIGIBLE_TASKS.has(request.taskType)) return SKIPPED
  if (request.prompt.trim().length < 12) return SKIPPED

  const supabase = getNexisClient()
  if (!supabase) return SKIPPED

  const keywords = extractKeywords(request.prompt)
  if (!keywords) return SKIPPED

  // ── Query — FTS first, scoped by branch domain if available ───────────
  try {
    let chunks: CanonChunkRow[] = []

    // Phase 1: domain-scoped FTS (if branch is set)
    if (request.branch) {
      const domainMap: Record<string, string> = {
        ACADEMY: "ACADEMY",
        HARBOR: "HARBOR",
        STUDIOS: "STUDIOS",
        MARKET: "MARKET",
        OPS: "OPS",
        CORE: "CORE",
      }
      const domain = domainMap[request.branch]
      if (domain) {
        const { data } = await supabase
          .from("nexis_canon_chunks")
          .select("chunk_id, title, tier, domain, section, text, authority_weight")
          .eq("domain", domain)
          .textSearch("text", keywords, { type: "websearch", config: "english" })
          .order("authority_weight", { ascending: false })
          .limit(MAX_CHUNKS)

        chunks = (data as CanonChunkRow[]) ?? []
      }
    }

    // Phase 2: global FTS if domain-scoped returned nothing
    if (chunks.length === 0) {
      const { data } = await supabase
        .from("nexis_canon_chunks")
        .select("chunk_id, title, tier, domain, section, text, authority_weight")
        .textSearch("text", keywords, { type: "websearch", config: "english" })
        .order("authority_weight", { ascending: false })
        .limit(MAX_CHUNKS)

      chunks = (data as CanonChunkRow[]) ?? []
    }

    if (chunks.length === 0) return SKIPPED

    return {
      systemPromptBlock: formatCanonBlock(chunks),
      chunkCount: chunks.length,
      skipped: false,
    }
  } catch {
    // Never let canon fetching break the gateway
    return SKIPPED
  }
}

// ── Formatter ─────────────────────────────────────────────────────────────────

/**
 * Formats canon chunks into a structured system-prompt context block.
 * Agents are instructed to treat this as Tier 1–2 authoritative reference.
 */
function formatCanonBlock(chunks: CanonChunkRow[]): string {
  const lines: string[] = [
    "── NEXIS CANON CONTEXT ──────────────────────────────────────────────────",
    "The following excerpts are from Thee Mystik Cove's authoritative canon",
    "knowledge base. Reference them when relevant to your response.",
    "",
  ]

  let totalChars = 0

  for (const chunk of chunks) {
    const header = [
      `[${chunk.tier}] ${chunk.title}`,
      chunk.section ? ` › ${chunk.section}` : "",
      ` (${chunk.domain})`,
    ].join("")

    // Truncate individual chunk text if needed
    const remaining = MAX_CONTEXT_CHARS - totalChars - header.length - 20
    if (remaining < 100) break

    const text = chunk.text.length > remaining
      ? chunk.text.slice(0, remaining).trimEnd() + "…"
      : chunk.text

    lines.push(header)
    lines.push(text)
    lines.push("")

    totalChars += header.length + text.length + 2
  }

  lines.push("────────────────────────────────────────────────────────────────────────")

  return lines.join("\n")
}
