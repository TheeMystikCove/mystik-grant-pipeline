/**
 * NEXIS AI Opportunity Scorer
 *
 * Uses Claude Haiku to score a grant opportunity against the org profile
 * using the 40/25/15/10/10 priority rubric. Writes results to opportunity_scores.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getAnthropicClient } from "@/lib/claude/client"

export interface AIScoreResult {
  strategic_fit_score: number
  eligibility_score: number
  readiness_score: number
  award_value_score: number
  urgency_score: number
  total_score: number
  label: string
  rationale: string
}

export async function scoreOpportunityAI(
  opportunityId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: AIScoreResult; error?: string }> {
  try {
    // ── Fetch opportunity ──────────────────────────────────────────────────
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single()
    if (oppError || !opp) return { success: false, error: "Opportunity not found" }

    // ── Fetch org context ─────────────────────────────────────────────────
    const [{ data: org }, { data: orgProfile }] = await Promise.all([
      supabase
        .from("organizations")
        .select("legal_name, mission, geography, annual_budget_range")
        .eq("id", opp.organization_id)
        .single(),
      supabase
        .from("organization_profiles")
        .select("target_populations_json, strategic_priorities_json, readiness_notes, registrations_json")
        .eq("organization_id", opp.organization_id)
        .single(),
    ])

    // ── Compute deadline urgency context ──────────────────────────────────
    const today = new Date()
    const deadline = opp.deadline ? new Date(opp.deadline) : null
    const daysUntilDeadline = deadline
      ? Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const urgencyContext =
      daysUntilDeadline == null ? "No deadline set — score 50."
      : daysUntilDeadline < 0   ? "Deadline has passed — score 0."
      : daysUntilDeadline < 14  ? `Only ${daysUntilDeadline} days — very urgent, score 20–40.`
      : daysUntilDeadline < 42  ? `${daysUntilDeadline} days — tight window, score 50–65.`
      : daysUntilDeadline < 90  ? `${daysUntilDeadline} days — ideal 6–13 week window, score 75–90.`
      : `${daysUntilDeadline} days — early stage, score 60–75.`

    // ── Build scoring prompt ───────────────────────────────────────────────
    const prompt = `Score this grant opportunity for the organization below. Return ONLY valid JSON — no prose, no markdown fences.

## Grant Opportunity
${JSON.stringify({
  name: opp.name,
  funder_name: opp.funder_name,
  funder_type: opp.funder_type,
  program_area: opp.program_area,
  award_range: opp.award_min || opp.award_max ? `$${opp.award_min ?? 0}–$${opp.award_max ?? "?"}` : "not specified",
  eligibility_text: opp.eligibility_text ?? "not provided",
  requirements_text: opp.requirements_text ?? "not provided",
  geography: opp.geography ?? "not specified",
  notes: opp.notes ?? "",
}, null, 2)}

## Organization
${JSON.stringify({
  name: org?.legal_name,
  mission: org?.mission ?? "not provided",
  geography: org?.geography,
  annual_budget_range: org?.annual_budget_range,
  target_populations: orgProfile?.target_populations_json ?? [],
  strategic_priorities: orgProfile?.strategic_priorities_json ?? [],
  readiness_notes: orgProfile?.readiness_notes ?? "not provided",
  registrations: orgProfile?.registrations_json ?? {},
}, null, 2)}

## Scoring Rubric (score each 0–100; assume moderate capability where data is missing)
- strategic_fit_score (40%): Mission/program/population/geo alignment
- eligibility_score (25%): Org type, registration, stated eligibility criteria
- readiness_score (15%): Capacity, documentation, budget-to-request ratio
- award_value_score (10%): Award size vs effort ($50K–$500K ideal; extremes reduce score)
- urgency_score (10%): ${urgencyContext}

Compute total_score = (strategic_fit * 0.40) + (eligibility * 0.25) + (readiness * 0.15) + (award_value * 0.10) + (urgency * 0.10), rounded to 1 decimal.
Label: ≥80 → "High Priority", ≥65 → "Strong Candidate", ≥45 → "Moderate Fit", ≥25 → "Low Priority", <25 → "Not Recommended"

Return exactly:
{"strategic_fit_score":<0-100>,"eligibility_score":<0-100>,"readiness_score":<0-100>,"award_value_score":<0-100>,"urgency_score":<0-100>,"total_score":<0-100>,"label":"<label>","rationale":"<2-3 sentences>"}`

    // ── Call Claude Haiku (fast + cheap) ──────────────────────────────────
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text" ? response.content[0].text : ""
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const scores = JSON.parse(cleaned) as AIScoreResult

    // ── Upsert score (replace any existing) ───────────────────────────────
    await supabase.from("opportunity_scores").delete().eq("opportunity_id", opportunityId)

    const { error: insertError } = await supabase.from("opportunity_scores").insert({
      opportunity_id: opportunityId,
      strategic_fit_score: scores.strategic_fit_score,
      eligibility_score: scores.eligibility_score,
      readiness_score: scores.readiness_score,
      award_value_score: scores.award_value_score,
      urgency_score: scores.urgency_score,
      total_score: scores.total_score,
      label: scores.label,
      rationale: scores.rationale,
    })

    if (insertError) return { success: false, error: insertError.message }

    return { success: true, data: scores }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
