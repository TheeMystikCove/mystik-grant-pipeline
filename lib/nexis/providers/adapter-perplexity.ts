// Perplexity Provider Adapter
// Perplexity uses an OpenAI-compatible API with a custom base URL.
// Maps NexisAIRequest → Perplexity Sonar → NexisAIResponse (with citations)

import OpenAI from "openai"
import { randomUUID } from "crypto"
import { getDefaultModel } from "../registries/model-registry"
import { estimateCost } from "../utils/cost-estimator"
import { buildSystemPrompt, buildUserMessage } from "../utils/normalize"
import type { NexisAIRequest } from "../schemas/ai-request"
import type { NexisAIResponse, NexisCitation } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not set")
    }
    _client = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    })
  }
  return _client
}

// Perplexity extends the OpenAI response format with citations
interface PerplexityResponse extends OpenAI.Chat.ChatCompletion {
  citations?: string[]
}

export async function runPerplexityAdapter(
  request: NexisAIRequest,
  routing: RoutingResult,
  agentSystemPrompt?: string
): Promise<NexisAIResponse> {
  const startTime = Date.now()
  const client = getClient()
  const model = routing.selectedModel ?? getDefaultModel("perplexity").id
  const systemPrompt = buildSystemPrompt(request, agentSystemPrompt)
  const userMessage = buildUserMessage(request)

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt })
    }
    messages.push({ role: "user", content: userMessage })

    // Perplexity supports return_citations parameter
    const response = (await client.chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      // @ts-expect-error — Perplexity extension not in OpenAI types
      return_citations: true,
    })) as PerplexityResponse

    const choice = response.choices[0]
    const output = choice?.message?.content ?? ""

    // Extract citations from Perplexity response
    const citations: NexisCitation[] | undefined = response.citations?.map(
      (url, index) => ({
        title: `Source ${index + 1}`,
        url,
        source: "perplexity",
      })
    )

    const _usage = response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined

    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: true,
      output,
      provider: "perplexity",
      model,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
      citations,
      _usage,
      estimatedCost: _usage ? estimateCost(model, _usage) : undefined,
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: false,
      error:
        error instanceof Error ? error.message : "Perplexity adapter failed",
      output: "",
      provider: "perplexity",
      model,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    }
  }
}
