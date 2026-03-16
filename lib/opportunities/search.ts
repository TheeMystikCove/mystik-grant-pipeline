import { callAgent } from "@/lib/claude/call-agent";
import { createAdminClient } from "@/lib/supabase/admin";
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

// ─── Main search function ─────────────────────────────────────────────────────

export async function searchGrantOpportunities(
  params: SearchParams
): Promise<ScoutedOpportunity[]> {
  const supabase = createAdminClient();

  // Load org profile to give the scout context
  const { data: org } = await supabase
    .from("organizations")
    .select("legal_name, display_name, entity_type, mission, geography")
    .eq("id", params.organizationId)
    .single();

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("target_populations_json, strategic_priorities_json")
    .eq("organization_id", params.organizationId)
    .single();

  // Build scout input
  const scoutInput = {
    organization_name: org?.display_name ?? org?.legal_name ?? "Unknown Organization",
    organization_type: org?.entity_type ?? "nonprofit",
    mission: org?.mission ?? "",
    org_geography: org?.geography ?? "",
    target_populations: profile?.target_populations_json ?? [],
    strategic_priorities: profile?.strategic_priorities_json ?? [],
    search_keywords: params.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    geography_filter: params.geography,
    funder_type_filter: params.funderType || "all",
    program_area_filter: params.programArea,
    count_requested: 10,
    search_mode: "on_demand",
  };

  // Call the scout agent
  const output = await callAgent({
    agentName: "grant_opportunity_scout",
    input: scoutInput,
  });

  // Extract opportunity list from structured output
  const raw = output.structured_output;
  const list: Record<string, unknown>[] = Array.isArray(raw?.opportunities)
    ? (raw.opportunities as Record<string, unknown>[])
    : Array.isArray(raw?.results)
    ? (raw.results as Record<string, unknown>[])
    : [];

  if (list.length === 0) return [];

  // Normalize and insert each opportunity
  const rows = list.map((item) => ({
    organization_id: params.organizationId,
    funder_name: String(item.funder_name ?? item.funder ?? "Unknown Funder"),
    name: String(item.name ?? item.title ?? item.opportunity_name ?? "Untitled Opportunity"),
    program_area: item.program_area ? String(item.program_area) : null,
    funder_type: normalizeFunderType(item.funder_type),
    deadline: item.deadline ? String(item.deadline) : null,
    award_min: item.award_min != null ? Number(item.award_min) : null,
    award_max: item.award_max != null ? Number(item.award_max) : null,
    geography: item.geography ? String(item.geography) : params.geography || null,
    source_url: item.source_url ?? item.url ? String(item.source_url ?? item.url) : null,
    eligibility_text: item.eligibility_text ? String(item.eligibility_text) : null,
    notes: item.notes ? String(item.notes) : null,
    status: "new",
    verification_status: "unverified",
  }));

  const { data: saved, error } = await supabase
    .from("opportunities")
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to save opportunities: ${error.message}`);
  const savedOpps = (saved ?? []) as ScoutedOpportunity[];

  // Fire-and-forget: score + eligibility check each opportunity
  for (const opp of savedOpps) {
    runScoringForOpportunity(opp.id, opp, params.organizationId).catch((err) =>
      console.error("[search] scoring error for", opp.id, err)
    );
  }

  return savedOpps;
}

// ─── Fire-and-forget scoring ──────────────────────────────────────────────────

async function runScoringForOpportunity(
  opportunityId: string,
  opp: ScoutedOpportunity,
  organizationId: string
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

  // Eligibility check
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

  // Priority scoring
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
    // Promote status to 'screening' once scored
    await supabase
      .from("opportunities")
      .update({ status: "screening" })
      .eq("id", opportunityId);
  } catch (e) {
    console.error("[search] scoring failed for", opportunityId, e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
