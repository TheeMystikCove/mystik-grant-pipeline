/**
 * NEXIS Companion — Database Tools
 *
 * Tool definitions (Anthropic format) and server-side executor for
 * Nexis to read/write the Grant Engine database during chat.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ── Tool definitions ──────────────────────────────────────────────────────────

export const NEXIS_DB_TOOLS = [
  {
    name: "add_opportunity",
    description:
      "Add a new grant opportunity to the Mystik Grant Engine tracker. Use when the user asks to save, track, log, or add a grant opportunity.",
    input_schema: {
      type: "object" as const,
      properties: {
        funder_name: { type: "string", description: "Name of the funder or foundation" },
        name: { type: "string", description: "Name or title of the grant program" },
        program_area: { type: "string", description: "Focus area (e.g. mental health, education, workforce development)" },
        funder_type: {
          type: "string",
          enum: ["federal", "state", "local", "private_foundation", "corporate", "community_foundation", "other"],
          description: "Category of funder",
        },
        deadline: {
          type: "string",
          description: "Application deadline in ISO 8601 format (YYYY-MM-DD)",
        },
        award_min: { type: "number", description: "Minimum award amount in USD" },
        award_max: { type: "number", description: "Maximum award amount in USD" },
        source_url: { type: "string", description: "URL to the grant opportunity or RFP" },
        notes: { type: "string", description: "Additional notes or context about this opportunity" },
      },
      required: ["funder_name", "name"],
    },
  },
  {
    name: "update_opportunity",
    description:
      "Update the status or notes on an existing grant opportunity. Use when the user wants to move a grant to a new stage, mark it as pursuing, submitted, awarded, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        opportunity_id: { type: "string", description: "UUID of the opportunity to update" },
        status: {
          type: "string",
          enum: [
            "new", "screening", "eligible", "not_eligible", "prioritized",
            "pursuing", "submitted", "awarded", "declined", "monitoring",
            "rejected", "archived",
          ],
          description: "New status for the opportunity",
        },
        notes: { type: "string", description: "Updated or appended notes" },
      },
      required: ["opportunity_id"],
    },
  },
  {
    name: "search_opportunities",
    description:
      "Search or list grant opportunities in the tracker. Use when the user asks what's in the pipeline, wants to find a specific grant, or wants a status report.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: [
            "new", "screening", "eligible", "not_eligible", "prioritized",
            "pursuing", "submitted", "awarded", "declined", "monitoring",
            "rejected", "archived",
          ],
          description: "Filter by status (omit to return all)",
        },
        funder_name: { type: "string", description: "Filter by funder name (partial match)" },
        limit: { type: "number", description: "Max results to return (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "add_proposal_project",
    description:
      "Create a new proposal project in the pipeline for a tracked opportunity. Use when the user wants to formally start writing a proposal.",
    input_schema: {
      type: "object" as const,
      properties: {
        opportunity_id: { type: "string", description: "UUID of the opportunity this proposal is for (optional)" },
        project_name: { type: "string", description: "Name of the proposal project" },
        requested_amount: { type: "number", description: "Amount being requested in USD" },
      },
      required: ["project_name"],
    },
  },
]

// ── Signal text shown to user while each tool executes ───────────────────────

export const DB_TOOL_SIGNALS: Record<string, string> = {
  add_opportunity:     "\n\n*◎ Adding to your grant tracker…*\n\n",
  update_opportunity:  "\n\n*◎ Updating the record…*\n\n",
  search_opportunities: "\n\n*◎ Searching your pipeline…*\n\n",
  add_proposal_project: "\n\n*◎ Creating proposal project…*\n\n",
}

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeNexisTool(
  toolName: string,
  input: Record<string, unknown>,
  orgId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "add_opportunity": {
        const { data, error } = await supabase
          .from("opportunities")
          .insert({
            organization_id: orgId,
            funder_name: input.funder_name,
            name: input.name,
            program_area: input.program_area ?? null,
            funder_type: input.funder_type ?? null,
            deadline: input.deadline ?? null,
            award_min: input.award_min ?? null,
            award_max: input.award_max ?? null,
            source_url: input.source_url ?? null,
            notes: input.notes ?? null,
            status: "new",
          })
          .select("id, name, funder_name, status")
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      case "update_opportunity": {
        const updates: Record<string, unknown> = {}
        if (input.status !== undefined) updates.status = input.status
        if (input.notes !== undefined) updates.notes = input.notes
        const { data, error } = await supabase
          .from("opportunities")
          .update(updates)
          .eq("id", input.opportunity_id as string)
          .eq("organization_id", orgId)
          .select("id, name, funder_name, status")
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      case "search_opportunities": {
        let query = supabase
          .from("opportunities")
          .select("id, name, funder_name, funder_type, status, deadline, award_min, award_max, program_area, notes")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit((input.limit as number) ?? 10)
        if (input.status) query = query.eq("status", input.status as string)
        if (input.funder_name) query = query.ilike("funder_name", `%${input.funder_name as string}%`)
        const { data, error } = await query
        if (error) return { success: false, error: error.message }
        return { success: true, data: data ?? [] }
      }

      case "add_proposal_project": {
        const { data, error } = await supabase
          .from("proposal_projects")
          .insert({
            organization_id: orgId,
            opportunity_id: input.opportunity_id ?? null,
            project_name: input.project_name,
            requested_amount: input.requested_amount ?? null,
            status: "draft",
            current_stage: "Intake Orchestrator",
          })
          .select("id, project_name, status, current_stage")
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
