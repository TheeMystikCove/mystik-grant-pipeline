// Request normalization utilities

import { randomUUID } from "crypto"
import { classifyTask } from "./classify-task"
import type { NexisAIRequest } from "../schemas/ai-request"

/**
 * Builds a full system prompt by combining the agent policy, context,
 * and any file content into a single string for provider adapters.
 */
export function buildSystemPrompt(
  request: NexisAIRequest,
  agentSystemPrompt?: string
): string {
  const parts: string[] = []

  if (agentSystemPrompt) {
    parts.push(agentSystemPrompt)
  }

  // Inject branch context
  if (request.branch) {
    parts.push(`\n[NEXIS BRANCH CONTEXT: ${request.branch}]`)
  }

  // Inject sensitivity constraint
  if (request.sensitivity === "high") {
    parts.push(
      "\n[SENSITIVITY: HIGH — Do not generate external-facing content. Internal use only.]"
    )
  }

  // Output format instruction
  if (request.outputFormat === "json") {
    parts.push(
      "\nRespond with valid JSON only. No prose, no markdown code fences."
    )
  }

  return parts.join("\n")
}

/**
 * Builds the full user-facing message, combining prompt + context + file content.
 */
export function buildUserMessage(request: NexisAIRequest): string {
  const parts: string[] = []

  if (request.context) {
    parts.push(`[CONTEXT]\n${request.context}\n`)
  }

  if (request.files && request.files.length > 0) {
    for (const file of request.files) {
      if (file.content) {
        parts.push(`[FILE: ${file.name}]\n${file.content}\n`)
      }
    }
  }

  parts.push(request.prompt)

  return parts.join("\n")
}

/**
 * Ensures required fields are populated on an incoming request.
 * Infers task type if not provided.
 */
export function normalizeRequest(
  partial: Partial<NexisAIRequest> & { prompt: string }
): NexisAIRequest {
  return {
    requestId: partial.requestId ?? randomUUID(),
    userId: partial.userId,
    sessionId: partial.sessionId,
    branch: partial.branch,
    agentName: partial.agentName,
    taskType: partial.taskType ?? classifyTask(partial.prompt),
    prompt: partial.prompt,
    context: partial.context,
    files: partial.files,
    requiresCitations: partial.requiresCitations ?? false,
    requiresTools: partial.requiresTools ?? false,
    preferredProvider: partial.preferredProvider,
    sensitivity: partial.sensitivity ?? "medium",
    outputFormat: partial.outputFormat ?? "markdown",
    stream: partial.stream ?? false,
    maxTokens: partial.maxTokens,
    temperature: partial.temperature,
  }
}
