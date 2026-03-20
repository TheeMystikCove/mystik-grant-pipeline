// Gemini Provider Adapter
// Maps NexisAIRequest → Google Generative AI format → NexisAIResponse

import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
} from "@google/generative-ai"
import { randomUUID } from "crypto"
import { getDefaultModel } from "../registries/model-registry"
import { estimateCost } from "../utils/cost-estimator"
import { buildSystemPrompt, buildUserMessage } from "../utils/normalize"
import type { NexisAIRequest } from "../schemas/ai-request"
import type { NexisAIResponse } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set")
    }
    _client = new GoogleGenerativeAI(key)
  }
  return _client
}

export async function runGeminiAdapter(
  request: NexisAIRequest,
  routing: RoutingResult,
  agentSystemPrompt?: string
): Promise<NexisAIResponse> {
  const startTime = Date.now()
  const client = getClient()
  const modelId = routing.selectedModel ?? getDefaultModel("gemini").id
  const systemPrompt = buildSystemPrompt(request, agentSystemPrompt)
  const userMessage = buildUserMessage(request)

  try {
    const model = client.getGenerativeModel({
      model: modelId,
      ...(systemPrompt
        ? { systemInstruction: { role: "system", parts: [{ text: systemPrompt }] } }
        : {}),
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 8192,
        ...(request.temperature !== undefined
          ? { temperature: request.temperature }
          : {}),
        ...(request.outputFormat === "json"
          ? { responseMimeType: "application/json" }
          : {}),
      },
    })

    const generateRequest: GenerateContentRequest = {
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
    }

    const result = await model.generateContent(generateRequest)
    const response = result.response
    const output = response.text()

    // Gemini returns usageMetadata
    const meta = response.usageMetadata
    const _usage = meta
      ? {
          inputTokens: meta.promptTokenCount ?? 0,
          outputTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : undefined

    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: true,
      output,
      provider: "gemini",
      model: modelId,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
      _usage,
      estimatedCost: _usage ? estimateCost(modelId, _usage) : undefined,
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      responseId: randomUUID(),
      success: false,
      error: error instanceof Error ? error.message : "Gemini adapter failed",
      output: "",
      provider: "gemini",
      model: modelId,
      taskType: request.taskType,
      agentName: request.agentName,
      branch: request.branch,
      routingReason: routing.rationale,
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    }
  }
}
