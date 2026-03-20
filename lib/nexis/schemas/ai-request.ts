// NEXIS_OS_SERVICE_AI_GATEWAY_V1 — Normalized Request Schema

export type NexisTaskType =
  | "architecture"
  | "workflow"
  | "research"
  | "grounding"
  | "code"
  | "proposal"
  | "knowledge_lookup"
  | "meeting_recap"
  | "content"
  | "general"

export type NexisBranch =
  | "CORE"
  | "ACADEMY"
  | "HARBOR"
  | "STUDIOS"
  | "MARKET"
  | "OPS"

export type NexisProvider = "claude" | "openai" | "gemini" | "perplexity"

export type NexisSensitivity = "low" | "medium" | "high"

export type NexisOutputFormat = "markdown" | "json" | "text"

export interface NexisFileAttachment {
  id: string
  name: string
  type?: string
  url?: string
  content?: string // pre-extracted text content
}

export interface NexisAIRequest {
  requestId: string
  userId?: string
  sessionId?: string
  branch?: NexisBranch
  agentName?: string
  taskType: NexisTaskType
  prompt: string
  context?: string
  files?: NexisFileAttachment[]
  requiresCitations?: boolean
  requiresTools?: boolean
  preferredProvider?: NexisProvider
  sensitivity?: NexisSensitivity
  outputFormat?: NexisOutputFormat
  stream?: boolean
  maxTokens?: number
  temperature?: number
}
