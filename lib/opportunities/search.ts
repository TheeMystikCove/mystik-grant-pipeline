import { callAgent } from "@/lib/claude/call-agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchGrantsGov } from "./grants-gov";
import { webSearchScout } from "./web-search-scout";
import { enrichFunderProfile } from "./funder-enrichment";
import type { FunderType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchParams {
  organizationId: string;
  keywords: string;
  geography: string;
  funderType: FunderType | "";
  programArea: string;
}

export interface ScoutedOpportunity {
  id: string;
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
  status: string;
  verification_status: string;
  created_at: string;
}

// ─── Main search ──────────────────────────────────────────────────────────────

export async function searchGrantOpportunities(
  params: SearchParams
): Promise<ScoutedOpportunity[]> {
  const supabase = createAdminClient();

  // Load org profile for Claude context
  const [{ data: org }, { data: profile }] = await Promise.all([
    supabase
      .from("organizations")
      .select("legal_name, display_name, entity_type, mission, geography")
      .eq("id", params.organizationId)
      .single(),
    supabase
      .from("organization_profiles")
      .select("target_populations_json, strategic_priorities_json")
      .eq("organization_id", params.organizationId)
      .single(),
  ]);

  // ── Source 1: Grants.gov live API (federal) ──────────────────────────────
  // Run in parallel with the Claude scout
  const grantsGovPromise = (params.funderType === "" || params.funderType === "federal")
    ? searchGrantsGov({
        keywords: params.keywords,
        programArea: params.programArea,
        geography: params.geography,
        funderType: params.funderType,
        limit: 15,
      }).catch((err) => {
        console.warn("[search] grants.gov error:", err);
        return [];
      })
    : Promise.resolve([]);

  // ── Source 2: Web search scout (live community/state/local/corporate) ──────
  // Skipped when searching federal-only
  const webScoutPromise = (params.funderType === "" || params.funderType !== "federal")
    ? webSearchScout({
        programArea: params.programArea,
        keywords: params.keywords,
        geography: params.geography,
        funderType: params.funderType,
        orgName: org?.display_name ?? org?.legal_name ?? "",
        orgMission: org?.mission ?? "",
      }).catch((err) => {
        console.warn("[search] web scout error:", err);
        return [];
      })
    : Promise.resolve([]);

  // ── Source 3: Claude scout (foundations, state, corporate) ───────────────
  const claudePromise = (params.funderType === "" || params.funderType !== "federal")
    ? callAgent({
        agentName: "grant_opportunity_scout",
        input: {
          organization_name: org?.display_name ?? org?.legal_name ?? "Unknown",
          organization_type: org?.entity_type ?? "nonprofit",
          mission: org?.mission ?? "",
          org_geography: org?.geography ?? "",
          target_populations: profile?.target_populations_json ?? [],
          strategic_priorities: profile?.strategic_priorities_json ?? [],
          search_keywords: params.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          geography_filter: params.geography,
          funder_type_filter: params.funderType || "all_non_federal",
          program_area_filter: params.programArea,
          current_date: new Date().toISOString().split("T")[0],
          note: "Federal grants are already covered by the Grants.gov live API. Focus exclusively on private foundations, community foundations, state funders, and corporate programs.",
        },
      }).catch((err) => {
        console.warn("[search] claude scout error:", err);
        return null;
      })
    : Promise.resolve(null);

  const [grantsGovResults, webScoutResults, claudeOutput] = await Promise.all([
    grantsGovPromise,
    webScoutPromise,
    claudePromise,
  ]);

  // ── Normalize Grants.gov results ─────────────────────────────────────────
  const federalRows = grantsGovResults.map((g) => ({
    organization_id: params.organizationId,
    funder_name: g.agency_name || "U.S. Federal Government",
    name: g.opportunity_title,
    program_area: g.funding_categories
      .map((c) => c)
      .join(", ") || params.programArea || null,
    funder_type: "federal" as FunderType,
    deadline: g.close_date ?? null,
    award_min: g.award_floor,
    award_max: g.award_ceiling,
    geography: "National",
    source_url: g.opportunity_url,
    eligibility_text: g.eligible_applicants.join("; ") || null,
    notes: g.summary_description
      ? g.summary_description.slice(0, 800)
      : null,
    status: "new",
    verification_status: "source_verified", // real API data
  }));

  // ── Normalize Claude results ──────────────────────────────────────────────
  const raw = claudeOutput?.structured_output;
  const claudeList: Record<string, unknown>[] = Array.isArray(raw?.opportunities)
    ? (raw.opportunities as Record<string, unknown>[])
    : Array.isArray(raw?.results)
    ? (raw.results as Record<string, unknown>[])
    : [];

  const claudeRows = claudeList.map((item) => ({
    organization_id: params.organizationId,
    funder_name: String(item.funder_name ?? item.funder ?? "Unknown Funder"),
    name: String(item.name ?? item.title ?? item.opportunity_name ?? "Untitled"),
    program_area: item.program_area ? String(item.program_area) : null,
    funder_type: normalizeFunderType(item.funder_type),
    deadline: sanitizeDeadline(item.deadline),
    award_min: item.award_min != null ? Number(item.award_min) : null,
    award_max: item.award_max != null ? Number(item.award_max) : null,
    geography: item.geography
      ? String(item.geography)
      : params.geography || null,
    source_url: item.source_url ?? item.url
      ? String(item.source_url ?? item.url)
      : null,
    eligibility_text: item.eligibility_text
      ? String(item.eligibility_text)
      : null,
    notes: item.notes
      ? `${String(item.notes)}${item.confidence ? ` [Confidence: ${item.confidence}]` : ""}`
      : item.confidence
      ? `[Confidence: ${item.confidence}]`
      : null,
    status: "new",
    verification_status: "unverified" as const,
  }));

  // ── Normalize web scout results ───────────────────────────────────────────
  const webScoutRows = (webScoutResults ?? []).map((item) => ({
    organization_id: params.organizationId,
    funder_name: item.funder_name,
    name: item.name,
    program_area: item.program_area,
    funder_type: item.funder_type,
    deadline: item.deadline,
    award_min: item.award_min,
    award_max: item.award_max,
    geography: item.geography,
    source_url: item.source_url,
    eligibility_text: item.eligibility_text,
    notes: item.notes,
    status: "new",
    verification_status: "web_verified" as const, // sourced from live web, not AI training data
  }));

  const allRows = [...federalRows, ...webScoutRows, ...claudeRows];
  if (allRows.length === 0) return [];

  // ── Deduplicate within this batch by (funder_name + name) ────────────────
  const seen = new Set<string>();
  const dedupedRows = allRows.filter((row) => {
    const key = `${row.funder_name.toLowerCase()}||${row.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Check which already exist in DB to preserve saved scores ─────────────
  const { data: existing } = await supabase
    .from("opportunities")
    .select("id, funder_name, name, program_area, funder_type, deadline, award_min, award_max, geography, source_url, eligibility_text, notes, status, verification_status, created_at")
    .eq("organization_id", params.organizationId)
    .in("name", dedupedRows.map((r) => r.name));

  const existingKeys = new Set(
    (existing ?? []).map((r: { funder_name: string; name: string }) =>
      `${r.funder_name.toLowerCase()}||${r.name.toLowerCase()}`
    )
  );

  const newRows = dedupedRows.filter(
    (r) => !existingKeys.has(`${r.funder_name.toLowerCase()}||${r.name.toLowerCase()}`)
  );

  // ── Insert only genuinely new opportunities ───────────────────────────────
  let newOpps: ScoutedOpportunity[] = [];
  if (newRows.length > 0) {
    const { data: inserted, error } = await supabase
      .from("opportunities")
      .insert(newRows)
      .select();
    if (error) throw new Error(`Failed to save opportunities: ${error.message}`);
    newOpps = (inserted ?? []) as ScoutedOpportunity[];
  }

  // ── Fire-and-forget: score + eligibility check + funder enrichment (new only)
  for (const opp of newOpps) {
    runScoringForOpportunity(opp.id, opp, params.organizationId).catch((err) =>
      console.error("[search] scoring error for", opp.id, err)
    );
    enrichFunderProfile(opp.funder_name).catch((err) =>
      console.error("[search] enrichment error for", opp.funder_name, err)
    );
  }

  // Return new + existing so the UI shows all results with saved scores intact
  const existingOpps = (existing ?? []) as ScoutedOpportunity[];
  return [...newOpps, ...existingOpps];
}

// ─── Fire-and-forget scoring ──────────────────────────────────────────────────

async function runScoringForOpportunity(
  opportunityId: string,
  opp: ScoutedOpportunity,
  _organizationId: string
): Promise<void> {
  const supabase = createAdminClient();

  const oppContext = {
    opportunity_id: opportunityId,
    funder_name: opp.funder_name,
    opportunity_name: opp.name,
    program_area: opp.program_area,
    funder_type: opp.funder_type,
    deadline: opp.deadline,
    award_min: opp.award_min,
    award_max: opp.award_max,
    geography: opp.geography,
    eligibility_text: opp.eligibility_text,
    notes: opp.notes,
  };

  try {
    const eligOutput = await callAgent({
      agentName: "eligibility_readiness_checker",
      input: oppContext,
    });
    const elig = eligOutput.structured_output;
    await supabase.from("readiness_checks").insert({
      opportunity_id: opportunityId,
      eligibility_status: normalizeEligStatus(elig.eligibility_status),
      readiness_status: elig.readiness_status ?? null,
      recommendation: elig.recommendation ?? null,
      registrations_complete: Boolean(elig.registrations_complete),
      attachments_complete: Boolean(elig.attachments_complete),
      financials_complete: Boolean(elig.financials_complete),
      uei_registered: Boolean(elig.uei_registered),
      irs_letter_on_file: Boolean(elig.irs_letter_on_file),
      recent_audit_on_file: Boolean(elig.recent_audit_on_file),
      notes: elig.notes ?? null,
    });
  } catch (e) {
    console.error("[search] eligibility check failed for", opportunityId, e);
  }

  try {
    const scoreOutput = await callAgent({
      agentName: "grant_match_prioritizer",
      input: oppContext,
    });
    const score = scoreOutput.structured_output;
    await supabase.from("opportunity_scores").insert({
      opportunity_id: opportunityId,
      strategic_fit_score: Number(score.strategic_fit_score ?? 0),
      eligibility_score: Number(score.eligibility_score ?? 0),
      readiness_score: Number(score.readiness_score ?? 0),
      award_value_score: Number(score.award_value_score ?? 0),
      urgency_score: Number(score.urgency_score ?? 0),
      total_score: Number(score.total_score ?? score.priority_score ?? 0),
      label: score.label ? String(score.label) : null,
      rationale: score.rationale ? String(score.rationale) : null,
    });
    await supabase
      .from("opportunities")
      .update({ status: "screening" })
      .eq("id", opportunityId);
  } catch (e) {
    console.error("[search] scoring failed for", opportunityId, e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns ISO date string (YYYY-MM-DD) if parseable, otherwise null.
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

function normalizeFunderType(raw: unknown): FunderType | null {
  const valid: FunderType[] = [
    "federal", "state", "local", "private_foundation",
    "corporate", "community_foundation", "other",
  ];
  return valid.includes(raw as FunderType) ? (raw as FunderType) : null;
}

function normalizeEligStatus(raw: unknown): "eligible" | "conditional" | "ineligible" {
  if (raw === "eligible" || raw === "conditional" || raw === "ineligible") return raw;
  return "conditional";
}
