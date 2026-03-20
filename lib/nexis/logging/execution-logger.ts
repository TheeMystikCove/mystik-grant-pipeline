// Execution Logger — persists all NEXIS AI gateway executions to Supabase
// Spec: section 14 — nexis_execution_logs table fields.
// Fire-and-forget: errors are swallowed so logging never breaks the response path.

import { createAdminClient } from "@/lib/supabase/admin"
import type { NexisAIRequest } from "../schemas/ai-request"
import type { NexisAIResponse } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

// Spec §14 — field names match nexis_execution_logs exactly
export interface ExecutionLogEntry {
  request_id: string
  user_id?: string
  session_id?: string
  branch?: string
  agent_name?: string
  task_type: string
  // Spec §14 uses "provider" and "model" (not selected_*)
  provider: string
  model: string
  fallback_provider: string
  fallback_used: boolean
  routing_reason: string
  // Content excerpts — redacted for high-sensitivity requests
  prompt_excerpt?: string
  output_excerpt?: string
  // Status
  success: boolean
  error?: string
  latency_ms?: number
  estimated_cost?: number
  created_at: string
  // Extended analytics
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  output_format?: string
  sensitivity?: string
  requires_citations?: boolean
  requires_tools?: boolean
}

const EXCERPT_LENGTH = 500

/**
 * Logs a completed execution to the nexis_execution_logs table.
 * Non-blocking — errors are caught and logged to console only.
 */
export async function logExecution(
  request: NexisAIRequest,
  response: NexisAIResponse,
  routing: RoutingResult
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const isHighSensitivity = request.sensitivity === "high"

    const entry: ExecutionLogEntry = {
      request_id: request.requestId,
      user_id: request.userId,
      session_id: request.sessionId,
      branch: request.branch,
      agent_name: request.agentName,
      task_type: request.taskType,
      provider: routing.selectedProvider,
      model: routing.selectedModel,
      fallback_provider: routing.fallbackProvider,
      fallback_used: !!response.fallbackProvider,
      routing_reason: routing.rationale,
      prompt_excerpt: isHighSensitivity
        ? "[REDACTED — high sensitivity]"
        : request.prompt.slice(0, EXCERPT_LENGTH),
      output_excerpt: isHighSensitivity
        ? "[REDACTED — high sensitivity]"
        : response.output.slice(0, EXCERPT_LENGTH),
      success: response.success,
      error: response.error,
      latency_ms: response.latencyMs,
      estimated_cost: response.estimatedCost,
      created_at: response.createdAt,
      input_tokens: response._usage?.inputTokens,
      output_tokens: response._usage?.outputTokens,
      total_tokens: response._usage?.totalTokens,
      output_format: request.outputFormat ?? "markdown",
      sensitivity: request.sensitivity ?? "medium",
      requires_citations: request.requiresCitations ?? false,
      requires_tools: request.requiresTools ?? false,
    }

    const { error } = await supabase
      .from("nexis_execution_logs")
      .insert(entry)

    if (error) {
      console.warn("[NEXIS Logger] Failed to log execution:", error.message)
    }
  } catch (err) {
    console.warn("[NEXIS Logger] Unexpected error:", err)
  }
}
