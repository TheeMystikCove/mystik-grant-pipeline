/**
 * NEXIS Web Search Grant Scout — Perplexity + OpenAI Two-Stage Pipeline
 *
 * Stage 1 (Perplexity Sonar Pro): Live web search across community foundations,
 *   state portals, private foundations, and corporate CSR programs.
 *   Returns raw research text + source citation URLs.
 *
 * Stage 2 (OpenAI GPT-4o-mini): Synthesizes Perplexity's raw output into rich,
 *   structured opportunity records — detailed notes, complete eligibility criteria,
 *   specific program descriptions, and intelligently matched source URLs.
 *
 * Runs as Source 2 alongside Grants.gov (federal) and the static Claude scout.
 */

import OpenAI from "openai";
import type { FunderType } from "@/types";

export interface WebScoutedOpportunity {
  funder_name: string;
  name: string;
  program_area: string | null;
  funder_type: FunderType | null;
  deadline: string | null;
  award_min: number | null;
  award_max: number | null;
  geography: string | null;
  source_url: string | null;
  eligibility_text: string | null;
  notes: string | null;
}

// Perplexity extends OpenAI response with citations
interface PerplexityCompletion extends OpenAI.Chat.ChatCompletion {
  citations?: string[];
}

// ─── Client singletons ────────────────────────────────────────────────────────

let _perplexityClient: OpenAI | null = null;
let _openaiClient: OpenAI | null = null;

function getPerplexityClient(): OpenAI {
  if (!_perplexityClient) {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not set");
    }
    _perplexityClient = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    });
  }
  return _perplexityClient;
}

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

// ─── Stage 1 prompt builders (research queries for Perplexity) ────────────────

function buildCommunityStateQuery(params: {
  area: string;
  geography: string;
  orgName: string;
  orgMission: string;
  today: string;
  year: number;
}): string {
  const { area, geography, orgName, orgMission, today, year } = params;
  return `Search for currently open or upcoming grant opportunities for a nonprofit in ${geography} focused on ${area}.

Organization: ${orgName}
Mission: ${orgMission}
Today: ${today}

Find REAL grant opportunities from:
1. Community foundations serving ${geography} with open grant cycles in ${year} or ${year + 1}
2. State government grant programs (non-federal) in this region
3. Local government or county-level funding programs
4. Regional foundations with open RFPs

For each opportunity you find, provide as much detail as possible: funder name, grant program name, deadline, award amounts, eligibility requirements, application process, geographic focus, and the direct URL to the grant page.

EXCLUDE: Federal grants (SAMHSA, HRSA, NIH, DOE, HUD, etc.), closed/expired grants, scholarships, government-only applicant programs.`;
}

function buildPrivateCorpQuery(params: {
  area: string;
  geography: string;
  orgName: string;
  orgMission: string;
  today: string;
  year: number;
}): string {
  const { area, geography, orgName, orgMission, today, year } = params;
  return `Search for currently open or upcoming private foundation and corporate grant opportunities for a nonprofit focused on ${area} in or near ${geography}.

Organization: ${orgName}
Mission: ${orgMission}
Today: ${today}

Find REAL grant opportunities from:
1. Private foundations with active RFPs or open cycles in ${year} or ${year + 1}
2. Corporate foundation and CSR grant programs funding nonprofits
3. National foundations with grants available in this program area
4. Family foundations currently accepting applications

For each opportunity you find, provide as much detail as possible: funder name, grant program name, deadline, award amounts, eligibility requirements, application process, geographic focus, and the direct URL to the grant page.

EXCLUDE: Federal grants (already covered separately), closed/expired grants, individual scholarships.`;
}

// ─── Main web scout ───────────────────────────────────────────────────────────

export async function webSearchScout(params: {
  programArea: string;
  keywords: string;
  geography: string;
  funderType: string;
  orgName: string;
  orgMission: string;
}): Promise<WebScoutedOpportunity[]> {
  const { programArea, keywords, geography, orgName, orgMission, funderType } = params;
  const area = [programArea, keywords].filter(Boolean).join(", ");
  const today = new Date().toISOString().split("T")[0];
  const year = new Date().getFullYear();

  const perplexity = getPerplexityClient();
  const queryParams = { area, geography, orgName, orgMission, today, year };

  // Determine which searches to run based on funder type filter
  const runCommunityState =
    !funderType ||
    funderType === "community_foundation" ||
    funderType === "state" ||
    funderType === "local";

  const runPrivateCorp =
    !funderType ||
    funderType === "private_foundation" ||
    funderType === "corporate" ||
    funderType === "other";

  // ── Stage 1: Parallel Perplexity searches ─────────────────────────────────
  const searchTasks: Promise<{ text: string; citations: string[]; label: string }>[] = [];

  if (runCommunityState) {
    searchTasks.push(
      runPerplexitySearch(perplexity, buildCommunityStateQuery(queryParams), "community/state/local")
    );
  }
  if (runPrivateCorp) {
    searchTasks.push(
      runPerplexitySearch(perplexity, buildPrivateCorpQuery(queryParams), "private/corporate")
    );
  }

  if (searchTasks.length === 0) return [];

  const settled = await Promise.allSettled(searchTasks);

  const communityText = settled[0]?.status === "fulfilled" ? settled[0].value.text : "";
  const privateText =
    settled[1]?.status === "fulfilled"
      ? settled[1].value.text
      : settled[0]?.status === "fulfilled" && !runCommunityState
      ? settled[0].value.text
      : "";

  const allCitations: string[] = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value.citations : []
  );

  const hasAnyContent = communityText.length > 0 || privateText.length > 0;
  if (!hasAnyContent) return [];

  // ── Stage 2: OpenAI synthesis ──────────────────────────────────────────────
  try {
    const openai = getOpenAIClient();
    const results = await synthesizeWithOpenAI(openai, {
      communityText,
      privateText,
      citations: allCitations,
      geography,
      area,
      year,
    });
    return results;
  } catch (err) {
    console.warn(
      "[web-search-scout] OpenAI synthesis failed, falling back to raw parse:",
      err instanceof Error ? err.message : err
    );
    // Fallback: try to parse any JSON that Perplexity happened to return
    const fallback: WebScoutedOpportunity[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        fallback.push(...parseRawJSON(result.value.text, result.value.citations, geography));
      }
    }
    return deduplicate(fallback);
  }
}

// ─── Stage 1: Single Perplexity research call ─────────────────────────────────

async function runPerplexitySearch(
  client: OpenAI,
  query: string,
  label: string
): Promise<{ text: string; citations: string[]; label: string }> {
  try {
    const response = (await client.chat.completions.create({
      model: "sonar-pro",
      max_tokens: 4096,
      messages: [{ role: "user", content: query }],
      // @ts-expect-error — Perplexity extension not in OpenAI types
      return_citations: true,
    })) as PerplexityCompletion;

    return {
      text: response.choices[0]?.message?.content ?? "",
      citations: response.citations ?? [],
      label,
    };
  } catch (err) {
    console.warn(
      `[web-search-scout] Perplexity error (${label}):`,
      err instanceof Error ? err.message : err
    );
    return { text: "", citations: [], label };
  }
}

// ─── Stage 2: OpenAI synthesis ────────────────────────────────────────────────

async function synthesizeWithOpenAI(
  client: OpenAI,
  params: {
    communityText: string;
    privateText: string;
    citations: string[];
    geography: string;
    area: string;
    year: number;
  }
): Promise<WebScoutedOpportunity[]> {
  const { communityText, privateText, citations, geography, area, year } = params;

  const citationBlock =
    citations.length > 0
      ? citations.map((url, i) => `[${i + 1}] ${url}`).join("\n")
      : "No citations available.";

  const systemPrompt = `You are a grant data extraction specialist. You receive raw web search results about grant funding opportunities and extract them into a structured JSON array.

For every real grant opportunity mentioned in the search results, create a detailed record with these fields:
- funder_name: Full official name of the funding organization
- name: Specific grant program name (not just the funder name)
- program_area: Specific and descriptive — e.g. "behavioral health and trauma-informed care for justice-involved youth" not just "health"
- funder_type: One of exactly: "state", "local", "private_foundation", "corporate", "community_foundation", "other"
- deadline: Exact date as YYYY-MM-DD if mentioned, otherwise null
- award_min: Minimum award amount as integer if mentioned, otherwise null
- award_max: Maximum award amount as integer if mentioned, otherwise null
- geography: Geographic scope of the grant
- source_url: The most relevant URL from the provided citations that links to this specific grant program (match intelligently — do not just assign by index)
- eligibility_text: Complete eligibility criteria — org type required, geography restrictions, budget/revenue thresholds, years in operation, issue areas served, what is excluded. Write 2-3 full sentences.
- notes: 2-4 sentences covering: what the program funds, application process and key steps, what makes a strong application, any special priorities or preferences, and any important deadlines or cycle information.

RULES:
- Only include REAL grants found in the search results — do not invent or hallucinate
- Do not include federal grants (SAMHSA, HRSA, NIH, DOE, HUD, NSF, etc.)
- Do not include closed or clearly expired grants
- The notes and eligibility_text fields must be substantive — not placeholder text
- Return ONLY a valid JSON array, no markdown, no explanation, no other text`;

  const sections: string[] = [];
  if (communityText) {
    sections.push(`=== SEARCH RESULTS: Community Foundations / State & Local Government ===\n${communityText}`);
  }
  if (privateText) {
    sections.push(`=== SEARCH RESULTS: Private Foundations / Corporate CSR ===\n${privateText}`);
  }
  sections.push(`=== SOURCE CITATION URLs ===\n${citationBlock}`);

  const userMessage = `${sections.join("\n\n")}

---
Extract all grant opportunities found above into a JSON array. Each opportunity should be for a nonprofit focused on "${area}" in or near "${geography}" in ${year} or ${year + 1}. Be as descriptive as possible in the notes and eligibility_text fields.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return parseSynthesisOutput(raw, geography);
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

const VALID_FUNDER_TYPES: FunderType[] = [
  "federal", "state", "local", "private_foundation",
  "corporate", "community_foundation", "other",
];

function normalizeOpportunity(item: Record<string, unknown>, defaultGeography: string): WebScoutedOpportunity {
  return {
    funder_name: String(item.funder_name ?? "Unknown"),
    name: String(item.name ?? "Untitled"),
    program_area: item.program_area ? String(item.program_area) : null,
    funder_type: VALID_FUNDER_TYPES.includes(item.funder_type as FunderType)
      ? (item.funder_type as FunderType)
      : "other",
    deadline: sanitizeDeadline(item.deadline),
    award_min: item.award_min != null ? Number(item.award_min) : null,
    award_max: item.award_max != null ? Number(item.award_max) : null,
    geography: item.geography ? String(item.geography) : defaultGeography || null,
    source_url: item.source_url ? String(item.source_url) : null,
    eligibility_text: item.eligibility_text ? String(item.eligibility_text) : null,
    notes: item.notes ? String(item.notes) : null,
  };
}

function parseSynthesisOutput(raw: string, defaultGeography: string): WebScoutedOpportunity[] {
  try {
    // gpt-4o-mini with json_object format returns a JSON object — look for array inside
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const list: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.opportunities)
      ? (parsed.opportunities as Record<string, unknown>[])
      : Array.isArray(parsed.results)
      ? (parsed.results as Record<string, unknown>[])
      : Array.isArray(parsed.grants)
      ? (parsed.grants as Record<string, unknown>[])
      : [];

    return deduplicate(
      list
        .filter((item) => item.funder_name && item.name)
        .map((item) => normalizeOpportunity(item, defaultGeography))
    );
  } catch {
    console.warn("[web-search-scout] OpenAI JSON parse failed");
    return [];
  }
}

// Fallback: extract any JSON array directly from Perplexity raw text
function parseRawJSON(
  raw: string,
  citations: string[],
  defaultGeography: string
): WebScoutedOpportunity[] {
  const stripped = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  const arrayMatch = stripped.match(/\[\s*\{[\s\S]*?\}\s*\]/) ?? raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (!arrayMatch) return [];

  try {
    const parsed = JSON.parse(arrayMatch[0]) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item.funder_name && item.name)
      .map((item, index) => {
        const opp = normalizeOpportunity(item, defaultGeography);
        // Index-based citation fallback when source_url is missing
        if (!opp.source_url && citations[index]) {
          opp.source_url = citations[index];
        }
        return opp;
      });
  } catch {
    return [];
  }
}

function deduplicate(opps: WebScoutedOpportunity[]): WebScoutedOpportunity[] {
  const seen = new Set<string>();
  return opps.filter((opp) => {
    const key = `${opp.funder_name.toLowerCase()}||${opp.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns ISO date (YYYY-MM-DD) if parseable, otherwise null.
 * Prevents descriptive strings like "Annual cycle (TBD)" from breaking
 * Supabase timestamp columns.
 */
function sanitizeDeadline(raw: unknown): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  const isoMatch = str.match(/^\d{4}-\d{2}-\d{2}$/);
  const slashMatch = str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
  const longMatch = str.match(/^[A-Za-z]+ \d{1,2},?\s*\d{4}$/);
  if (!isoMatch && !slashMatch && !longMatch) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}
