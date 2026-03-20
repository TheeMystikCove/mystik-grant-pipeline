// Claude Provider Adapter
// Maps NexisAIRequest → Anthropic API format → NexisAIResponse

import Anthropic from "@anthropic-ai/sdk"
import { randomUUID } from "crypto"
import { getDefaultModel } from "../registries/model-registry"
import { estimateCost } from "../utils/cost-estimator"
import { buildSystemPrompt, buildUserMessage } from "../utils/normalize"
import type { NexisAIRequest } from "../schemas/ai-request"
import type { NexisAIResponse } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set")
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export async function runClaudeAdapter(
  request: NexisAIRequest,
  routing: RoutingResult,
  agentSystemPrompt?: string
): Promise<NexisAIResponse> {
  const startTime = Date.now()
  const client = getClient()
  const model = routing.selectedModel ?? getDefaultModel("claude").id
  const systemPrompt = buildSystemPrompt(request, agentSystemPrompt)
  const userMessage = buildUserMessage(request)

  try {
    const response = await client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 8096,
      system: systemPrompt || undefined,
      messages: [{ role: "user", content: userMessage }],
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
    })

    const output =
      response.content[0]?.type === "text" ? response.content[0].text : ""

    const _usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    }

    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: true,
      output,
      provider: "claude",
      model,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
      _usage,
      estimatedCost: estimateCost(model, _usage),
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: false,
      error: error instanceof Error ? error.message : "Claude adapter failed",
      output: "",
      provider: "claude",
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
