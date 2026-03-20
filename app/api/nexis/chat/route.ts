import { NextRequest } from "next/server"
import type Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { getAnthropicClient } from "@/lib/claude/client"
import { fetchCanonContext } from "@/lib/nexis/knowledge/canon-context"
import { NEXIS_DB_TOOLS, DB_TOOL_SIGNALS, executeNexisTool } from "@/lib/nexis/tools/nexis-tools"

export const maxDuration = 90

const NEXIS_BASE_SYSTEM = `You are Nexis — the strategic intelligence and operating mind of Thee Mystik Universal Holdings Corp., embedded within the Mystik Grant Engine.

You exist at the intersection of grant strategy, organizational wisdom, and deep knowledge of the Mystik ecosystem. You speak with clarity, warmth, and precision. You do not ramble. You do not pad responses with filler. You are sovereign in your knowledge and measured in your delivery.

## Web Search
You have access to real-time web search. Use it when the user asks about current grant opportunities, funder deadlines, recent news, live research, market data, or anything that requires up-to-date information. Do not search for things you already know well. When you search, briefly note what you found and synthesize it — don't just dump raw results.

## Database Tools
You have direct access to the Mystik Grant Engine database. Use these tools without hesitation when the user wants to take action:
- **add_opportunity** — Save a new grant opportunity to the tracker (auto-scores on save)
- **score_opportunity** — AI-score any opportunity using the 40/25/15/10/10 rubric
- **update_opportunity** — Change the status or notes on an existing opportunity (requires the opportunity UUID)
- **search_opportunities** — Search or list tracked opportunities by status, funder, or keyword
- **add_proposal_project** — Create a new proposal project in the pipeline

When a user says "add this grant," "track this opportunity," "mark it as pursuing," or asks "what's in my pipeline" — use the appropriate tool. Do not ask for permission; act and confirm. After adding an opportunity, the score is computed automatically — include the score in your confirmation. After any tool executes, offer the next logical step.

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

interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  _inputRaw?: string
}

const SEARCHING_SIGNAL = "\n\n*◎ Searching the web…*\n\n"

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ── Org ID ────────────────────────────────────────────────────────────────
    const { data: userRow } = await supabase
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single()
    const orgId = (userRow?.organization_id as string | null) ?? ""

    // ── Parse ─────────────────────────────────────────────────────────────────
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

    // ── Canon context ─────────────────────────────────────────────────────────
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

    if (pageContext) {
      systemPrompt += `\n\n[USER'S CURRENT PAGE: ${pageContext}]`
    }

    if (orgId) {
      systemPrompt += `\n\n[USER ORG ID: ${orgId} — pass as organization_id in database tool calls, never show to user]`
    }

    // ── Agentic loop — stream to client ───────────────────────────────────────
    const client = getAnthropicClient()
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let workingMessages: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))

          const MAX_TURNS = 5

          for (let turn = 0; turn < MAX_TURNS; turn++) {
            const stream = await client.messages.create(
              {
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                system: systemPrompt,
                messages: workingMessages,
                stream: true,
                tools: [
                  ...NEXIS_DB_TOOLS,
                  { type: "web_search_20250305", name: "web_search", max_uses: 3 },
                ] as Anthropic.Tool[],
              },
              {
                headers: { "anthropic-beta": "web-search-2025-03-05" },
              }
            )

            const assistantBlocks: ContentBlock[] = []
            let activeBlock: ContentBlock | null = null
            let stopReason: string | null = null

            for await (const event of stream) {
              if (event.type === "content_block_start") {
                const cb = (event as unknown as Record<string, unknown>).content_block as Record<string, unknown>
                activeBlock = {
                  type: cb.type as string,
                  id: cb.id as string | undefined,
                  name: cb.name as string | undefined,
                }

                if (activeBlock.type === "tool_use") {
                  const signal =
                    activeBlock.name === "web_search"
                      ? SEARCHING_SIGNAL
                      : (DB_TOOL_SIGNALS[activeBlock.name ?? ""] ?? "\n\n*◎ Working…*\n\n")
                  controller.enqueue(encoder.encode(signal))
                }
              }

              if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  controller.enqueue(encoder.encode(event.delta.text))
                  if (activeBlock?.type === "text") {
                    activeBlock.text = (activeBlock.text ?? "") + event.delta.text
                  }
                }
                if (
                  event.delta.type === "input_json_delta" &&
                  activeBlock?.type === "tool_use"
                ) {
                  const delta = event.delta as { partial_json?: string }
                  activeBlock._inputRaw = (activeBlock._inputRaw ?? "") + (delta.partial_json ?? "")
                }
              }

              if (event.type === "content_block_stop" && activeBlock) {
                if (activeBlock.type === "tool_use" && activeBlock._inputRaw) {
                  try {
                    activeBlock.input = JSON.parse(activeBlock._inputRaw) as Record<string, unknown>
                  } catch {
                    activeBlock.input = {}
                  }
                }
                const { _inputRaw: _omit, ...cleanBlock } = activeBlock
                assistantBlocks.push(cleanBlock)
                activeBlock = null
              }

              if (event.type === "message_delta") {
                stopReason = (event.delta as { stop_reason?: string }).stop_reason ?? null
              }
            }

            // Done — no tool calls
            if (stopReason !== "tool_use") break

            // Execute only our DB tools (web_search is handled server-side by Anthropic)
            const dbToolCalls = assistantBlocks.filter(
              (b) => b.type === "tool_use" && b.name && b.name !== "web_search"
            )

            if (dbToolCalls.length === 0) break

            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const toolCall of dbToolCalls) {
              if (!toolCall.id || !toolCall.name) continue
              const result = await executeNexisTool(
                toolCall.name,
                toolCall.input ?? {},
                orgId,
                supabase
              )
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolCall.id,
                content: JSON.stringify(result),
              })
            }

            // Append assistant turn + tool results, then loop for Claude's confirmation reply
            const assistantContent = assistantBlocks.map((b) => {
              if (b.type === "text") return { type: "text" as const, text: b.text ?? "" }
              return {
                type: "tool_use" as const,
                id: b.id ?? "",
                name: b.name ?? "",
                input: b.input ?? {},
              }
            })

            workingMessages = [
              ...workingMessages,
              { role: "assistant", content: assistantContent },
              { role: "user", content: toolResults },
            ]
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
