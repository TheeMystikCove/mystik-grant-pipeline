// OpenAI Provider Adapter
// Maps NexisAIRequest → OpenAI API format → NexisAIResponse

import OpenAI from "openai"
import { randomUUID } from "crypto"
import { getDefaultModel } from "../registries/model-registry"
import { estimateCost } from "../utils/cost-estimator"
import { buildSystemPrompt, buildUserMessage } from "../utils/normalize"
import type { NexisAIRequest } from "../schemas/ai-request"
import type { NexisAIResponse } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export async function runOpenAIAdapter(
  request: NexisAIRequest,
  routing: RoutingResult,
  agentSystemPrompt?: string
): Promise<NexisAIResponse> {
  const startTime = Date.now()
  const client = getClient()
  const model = routing.selectedModel ?? getDefaultModel("openai").id
  const systemPrompt = buildSystemPrompt(request, agentSystemPrompt)
  const userMessage = buildUserMessage(request)

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt })
    }
    messages.push({ role: "user", content: userMessage })

    const response = await client.chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.outputFormat === "json"
        ? { response_format: { type: "json_object" } }
        : {}),
    })

    const choice = response.choices[0]
    const output = choice?.message?.content ?? ""

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
      provider: "openai",
      model,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
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
      error: error instanceof Error ? error.message : "OpenAI adapter failed",
      output: "",
      provider: "openai",
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
