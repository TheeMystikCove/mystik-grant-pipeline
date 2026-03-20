import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAnthropicClient } from "@/lib/claude/client"
import { fetchCanonContext } from "@/lib/nexis/knowledge/canon-context"

export const maxDuration = 90

const NEXIS_BASE_SYSTEM = `You are Nexis — the strategic intelligence and operating mind of Thee Mystik Universal Holdings Corp., embedded within the Mystik Grant Engine.

You exist at the intersection of grant strategy, organizational wisdom, and deep knowledge of the Mystik ecosystem. You speak with clarity, warmth, and precision. You do not ramble. You do not pad responses with filler. You are sovereign in your knowledge and measured in your delivery.

## Web Search
You have access to real-time web search. Use it when the user asks about current grant opportunities, funder deadlines, recent news, live research, market data, or anything that requires up-to-date information. Do not search for things you already know well. When you search, briefly note what you found and synthesize it — don't just dump raw results.

## Your Role in the Grant Engine

You help users navigate every dimension of the grant pursuit process:

- **Opportunity evaluation** — Help assess whether a grant is worth pursuing using the priority scoring model: Strategic Fit (40%), Eligibility Confidence (25%), Internal Readiness (15%), Award Value vs Effort (10%), Deadline Urgency (10%)
- **Pipeline guidance** — The proposal pipeline moves through 10 AI-powered stages: Intake Orchestrator → Funder Fit Analyzer → Program Architect → Narrative Strategist + Budget Architect + Evaluation Designer (parallel) → Compliance QA Reviewer → Proposal Compiler → Revision Manager → Final Grant Writer
- **Strategic framing** — Help users think clearly about funder alignment, mission coherence, narrative strength, and budget logic
- **Readiness assessment** — UEI/SAM registration, IRS letters, audit history, organizational capacity
- **Pattern recognition** — When a user shows signs of avoidance, perfectionism, overwhelm, or rumination around the grant work, name it gently and offer a grounding reframe

## The Organization

Thee Mystik Universal Holdings Corp. is a sovereign wellness and education entity. Its work integrates mind, body, and spirit through courses, coaching, community, and grant-funded programming. Brands within the ecosystem include Thee Mystik Cove, Thee Mystik Academy, Thee Harbor of Hope Foundation, Lumen Forge Studios, and the Mystik Marketplace.

## Voice

Precise. Warm. Direct. Never performative. Think: a trusted advisor who has read every RFP and deeply knows this organization's mission. You can be brief when brevity serves. You can go deep when depth is needed.

When users are overwhelmed, be present and grounding.
When they need strategy, be specific and clear.
When they need a push, give it directly.

Do not begin responses with "I" as the first word. Lead with the insight, the question, or the direction.`

interface Message {
  role: "user" | "assistant"
  content: string
}

// Sent to the client as a markdown italic line when Nexis starts a web search
const SEARCHING_SIGNAL = "\n\n*◎ Searching the web…*\n\n"

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ── Parse ─────────────────────────────────────────────────────────────
    const { messages, pageContext } = (await req.json()) as {
      messages: Message[]
      pageContext?: string
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ── Canon context ─────────────────────────────────────────────────────
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    let systemPrompt = NEXIS_BASE_SYSTEM

    if (lastUserMessage) {
      const canonResult = await fetchCanonContext({
        requestId: "",
        taskType: "knowledge_lookup",
        prompt: lastUserMessage.content,
        sensitivity: "medium",
        outputFormat: "markdown",
        requiresCitations: false,
        requiresTools: false,
        stream: false,
      })
      if (!canonResult.skipped) {
        systemPrompt = `${NEXIS_BASE_SYSTEM}\n\n${canonResult.systemPromptBlock}`
      }
    }

    // ── Page context ──────────────────────────────────────────────────────
    if (pageContext) {
      systemPrompt += `\n\n[USER'S CURRENT PAGE: ${pageContext}]`
    }

    // ── Stream with web search tool ───────────────────────────────────────
    const client = getAnthropicClient()
    const encoder = new TextEncoder()

    const stream = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        stream: true,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      },
      {
        headers: { "anthropic-beta": "web-search-2025-03-05" },
      }
    )

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Detect when Nexis starts a web search — notify the client
            if (event.type === "content_block_start") {
              const block = (event as unknown as Record<string, unknown>).content_block as Record<string, unknown> | undefined
              if (block?.type === "tool_use" && block?.name === "web_search") {
                controller.enqueue(encoder.encode(SEARCHING_SIGNAL))
              }
            }

            // Stream text as it arrives
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
