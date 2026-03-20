// NEXIS_OS_SERVICE_AI_GATEWAY_V1 — Unified Response Schema
// All provider adapters return this shape — field names match the spec exactly.

import type { NexisProvider, NexisTaskType } from "./ai-request"

export interface NexisCitation {
  title?: string
  url?: string
  source?: string
}

export interface NexisTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface NexisAIResponse {
  // Request identity
  requestId: string
  responseId: string // internal tracking UUID

  // Provider context
  provider: NexisProvider
  model: string
  agentName?: string
  taskType: NexisTaskType | string
  branch?: string

  // Core output
  output: string                               // primary text output
  structuredOutput?: Record<string, unknown>   // parsed JSON when outputFormat = "json"

  // Citations (Perplexity / grounded responses)
  citations?: NexisCitation[]

  // Routing metadata
  routingReason: string
  fallbackProvider?: string                    // set only when fallback was triggered

  // Performance
  latencyMs?: number
  estimatedCost?: number                       // USD

  // Status
  success: boolean
  error?: string

  // Timestamp
  createdAt: string // ISO 8601

  // Internal — token usage, not forwarded to UI
  _usage?: NexisTokenUsage
}
