// NEXIS AI Gateway — API Route
// POST /api/ai
// Zod-validated, auth-gated. Routes to the correct provider via the NEXIS gateway.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { executeAIRequest } from "@/lib/nexis/gateway/ai-gateway"
import { normalizeRequest } from "@/lib/nexis/utils/normalize"

export const maxDuration = 120 // seconds

// ── Zod schema for incoming request body ─────────────────────────────────────
// taskType and outputFormat values must match NexisTaskType / NexisOutputFormat in ai-request.ts
const NexisRequestBodySchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  taskType: z
    .enum([
      "architecture",
      "workflow",
      "research",
      "grounding",
      "code",
      "proposal",
      "knowledge_lookup",
      "meeting_recap",
      "content",
      "general",
    ])
    .optional(),
  agentName: z.string().optional(),
  branch: z
    .enum(["CORE", "ACADEMY", "HARBOR", "STUDIOS", "MARKET", "OPS"])
    .optional(),
  sessionId: z.string().optional(),
  context: z.string().optional(),
  preferredProvider: z
    .enum(["claude", "openai", "gemini", "perplexity"])
    .optional(),
  requiresCitations: z.boolean().optional(),
  requiresTools: z.boolean().optional(),
  outputFormat: z.enum(["markdown", "json", "text"]).optional(),
  sensitivity: z.enum(["low", "medium", "high"]).optional(),
  maxTokens: z.number().int().positive().max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── Parse body ───────────────────────────────────────────────────
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    // ── Zod validation ───────────────────────────────────────────────
    const parsed = NexisRequestBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // ── Normalize request ────────────────────────────────────────────
    const nexisRequest = normalizeRequest({
      ...parsed.data,
      userId: user.id,
    })

    // ── Execute through gateway ──────────────────────────────────────
    const response = await executeAIRequest(nexisRequest)

    // ── Return ───────────────────────────────────────────────────────
    const statusCode = response.success ? 200 : 500

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error("[NEXIS /api/ai] Unexpected error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    )
  }
}
