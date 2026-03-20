/**
 * NEXIS Web Search Grant Scout
 *
 * Uses Claude + live web_search tool to find currently-open grant opportunities
 * from sources the static Claude scout can't reach:
 *   - Community foundation portals (city/county/region)
 *   - State government grant databases
 *   - Private foundation websites with active RFPs
 *   - Corporate foundation CSR portals
 *   - Local government funding programs
 *
 * Runs as Source 3 alongside Grants.gov (federal) and the static Claude scout.
 */

import { getAnthropicClient } from "@/lib/claude/client";
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

// ─── Query builder ────────────────────────────────────────────────────────────

function buildSearchQueries(params: {
  programArea: string;
  keywords: string;
  geography: string;
  funderType: string;
}): string[] {
  const { programArea, keywords, geography, funderType } = params;
  const area = [programArea, keywords].filter(Boolean).join(" ");
  const year = new Date().getFullYear();
  const nextYear = year + 1;
  const stateMatch = geography.match(/\b(ohio|michigan|indiana|kentucky|pennsylvania|new york|texas|california|illinois|georgia|florida)\b/i);
  const state = stateMatch?.[0] ?? geography.split(",")[0].trim();

  const queries: string[] = [];

  // Community foundations (geo-specific)
  if (!funderType || funderType === "community_foundation") {
    queries.push(
      `"${geography}" community foundation grant "${area}" ${year} OR ${nextYear} nonprofit open RFP deadline application`
    );
  }

  // State government grants (non-federal)
  if (!funderType || funderType === "state") {
    queries.push(
      `${state} state government grant program "${area}" nonprofit ${year} application deadline -site:grants.gov`
    );
  }

  // Private foundations + local government
  if (!funderType || funderType === "private_foundation" || funderType === "local") {
    queries.push(
      `"${area}" foundation grant "${geography}" ${year} nonprofit eligibility deadline RFP letters of inquiry`
    );
  }

  // Corporate/CSR
  if (!funderType || funderType === "corporate") {
    queries.push(
      `corporate foundation CSR grant "${area}" "${geography}" ${year} nonprofit open application`
    );
  }

  return queries.slice(0, 4); // Cap at 4 queries
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
  const { programArea, keywords, geography, orgName, orgMission } = params;
  const queries = buildSearchQueries(params);
  if (queries.length === 0) return [];

  const area = [programArea, keywords].filter(Boolean).join(", ");
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a grant research specialist. Your job is to find currently open or upcoming grant opportunities for nonprofits using live web search.

Organization: ${orgName}
Mission: ${orgMission}
Program area seeking funding: ${area}
Geographic focus: ${geography}
Today's date: ${today}

SEARCH STRATEGY:
Use the web search tool to run each of these targeted queries. Search for REAL, currently open opportunities — not hypothetical ones.

Queries to run:
${queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

WHAT TO FIND:
- Community foundations with open grant cycles in the region
- State government grant programs (non-federal)
- Private foundation RFPs currently accepting applications
- Corporate/CSR foundation programs
- Local government or county funding programs
- Do NOT include federal grants (those are handled by Grants.gov separately)

WHAT TO EXCLUDE:
- Closed or past-deadline grants (only include open or upcoming within 12 months)
- Federal grants (SAMHSA, HRSA, NIH, DOE, etc. — already covered)
- Scholarship programs, individual grants, or awards
- Grants requiring government applicants only

OUTPUT FORMAT:
After searching, return ONLY a valid JSON array with no other text:

[
  {
    "funder_name": "Greater Cleveland Community Foundation",
    "name": "Healthy Neighborhoods Grant Program",
    "program_area": "Mental health and community wellness",
    "funder_type": "community_foundation",
    "deadline": "2025-09-15",
    "award_min": 10000,
    "award_max": 50000,
    "geography": "Greater Cleveland, OH",
    "source_url": "https://...",
    "eligibility_text": "501(c)(3) nonprofits serving Cuyahoga County",
    "notes": "Letters of inquiry due July 1. Full proposals by invitation only."
  }
]

funder_type must be one of: "state", "local", "private_foundation", "corporate", "community_foundation", "other"
If deadline is unknown, set to null. If award amounts unknown, set to null.
If you cannot find any real opportunities, return an empty array: []`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [
          {
            type: "web_search_20250305" as const,
            name: "web_search",
            max_uses: 6,
          },
        ],
        messages: [
          {
            role: "user",
            content: `Search for grant opportunities in ${geography} for a nonprofit focused on ${area}. Run each of the ${queries.length} queries provided in your system prompt, then return the JSON array of real opportunities found.`,
          },
        ],
      },
      {
        headers: { "anthropic-beta": "web-search-2025-03-05" },
      }
    );

    // Extract the final text block (after all tool use rounds)
    const textBlock = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return parseWebScoutOutput(textBlock, geography);
  } catch (err) {
    console.warn("[web-search-scout] Error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseWebScoutOutput(raw: string, defaultGeography: string): WebScoutedOpportunity[] {
  // Try to extract JSON array from the response
  const arrayMatch = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (!arrayMatch) return [];

  try {
    const parsed = JSON.parse(arrayMatch[0]) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) return [];

    const valid: FunderType[] = [
      "federal", "state", "local", "private_foundation",
      "corporate", "community_foundation", "other",
    ];

    return parsed
      .filter((item) => item.funder_name && item.name)
      .map((item): WebScoutedOpportunity => ({
        funder_name: String(item.funder_name ?? "Unknown"),
        name: String(item.name ?? "Untitled"),
        program_area: item.program_area ? String(item.program_area) : null,
        funder_type: valid.includes(item.funder_type as FunderType)
          ? (item.funder_type as FunderType)
          : "other",
        deadline: item.deadline ? String(item.deadline) : null,
        award_min: item.award_min != null ? Number(item.award_min) : null,
        award_max: item.award_max != null ? Number(item.award_max) : null,
        geography: item.geography ? String(item.geography) : defaultGeography || null,
        source_url: item.source_url ? String(item.source_url) : null,
        eligibility_text: item.eligibility_text ? String(item.eligibility_text) : null,
        notes: item.notes ? String(item.notes) : null,
      }));
  } catch {
    console.warn("[web-search-scout] JSON parse failed");
    return [];
  }
}
