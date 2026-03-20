// POST /api/nexis/agent
// Invokes a named NEXIS OS agent through the gateway.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runNexisAgent } from "@/lib/nexis/agents/agent-runner"

export const maxDuration = 120

const BodySchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().min(1),
  context: z.string().optional(),
  sessionId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse + validate
    let raw: unknown
    try { raw = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const result = await runNexisAgent({ ...parsed.data, userId: user.id })

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
