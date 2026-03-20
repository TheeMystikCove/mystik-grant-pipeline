/**
 * NEXIS Agent Runner
 *
 * Invokes a named NEXIS OS agent through the gateway.
 * Loads the agent definition, builds the request, executes, returns.
 */

import { randomUUID } from "crypto"
import { executeAIRequest } from "../gateway/ai-gateway"
import { getAgentDefinition } from "./agent-definitions"
import type { NexisAIResponse } from "../schemas/ai-response"

export interface AgentRunRequest {
  agentId: string
  prompt: string
  context?: string
  sessionId?: string
  userId?: string
}

export interface AgentRunResult {
  success: boolean
  agentId: string
  agentName: string
  output: string
  provider: string
  model: string
  latencyMs?: number
  routingReason?: string
  error?: string
}

export async function runNexisAgent(params: AgentRunRequest): Promise<AgentRunResult> {
  const { agentId, prompt, context, sessionId, userId } = params

  const definition = getAgentDefinition(agentId)
  if (!definition) {
    return {
      success: false,
      agentId,
      agentName: agentId,
      output: "",
      provider: "none",
      model: "none",
      error: `No agent definition found for: ${agentId}`,
    }
  }

  const response: NexisAIResponse = await executeAIRequest(
    {
      requestId: randomUUID(),
      agentName: agentId,
      taskType: definition.taskType,
      prompt,
      context,
      branch: definition.domain,
      sensitivity: definition.sensitivity,
      requiresCitations: definition.requiresCitations,
      requiresTools: false,
      outputFormat: "markdown",
      stream: false,
      sessionId,
      userId,
    },
    definition.systemPrompt
  )

  return {
    success: response.success,
    agentId,
    agentName: definition.displayName,
    output: response.output,
    provider: response.provider,
    model: response.model,
    latencyMs: response.latencyMs,
    routingReason: response.routingReason,
    error: response.error,
  }
}
