// NEXIS_OS_AGENT_PROVIDER_ROUTER_V1 — Routing Decision Schema

import type { NexisProvider, NexisTaskType } from "./ai-request"

export interface RoutingResult {
  selectedProvider: NexisProvider
  selectedModel: string
  fallbackProvider: NexisProvider
  fallbackModel: string
  rationale: string
  taskType: NexisTaskType
  requiresTools: boolean
  requiresCitations: boolean
  toolsConfig?: Record<string, unknown>
}
