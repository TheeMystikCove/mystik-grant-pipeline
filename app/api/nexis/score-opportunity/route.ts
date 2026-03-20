// POST /api/nexis/score-opportunity
// Triggers AI scoring for a specific opportunity. Auth-gated.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { scoreOpportunityAI } from "@/lib/nexis/scoring/score-opportunity"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { opportunity_id } = (await req.json()) as { opportunity_id?: string }
    if (!opportunity_id) {
      return NextResponse.json({ error: "opportunity_id required" }, { status: 400 })
    }

    const result = await scoreOpportunityAI(opportunity_id, supabase)
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
