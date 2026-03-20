// NEXIS Provider Registry
// Spec: section 9 (routing logic) and section 11 (provider registry).

import type { NexisProvider, NexisTaskType } from "../schemas/ai-request"

export type CostClass = "low" | "medium" | "high"
export type LatencyClass = "fast" | "medium" | "slow"

export interface ProviderRegistryEntry {
  provider: NexisProvider
  enabled: boolean
  strengths: string[]
  defaultTaskTypes: NexisTaskType[]
  fallbackProvider?: NexisProvider
  supportsCitations: boolean
  supportsTools: boolean
  costClass: CostClass
  latencyClass: LatencyClass
  displayName: string
  supportsStreaming: boolean
  supportsFileInput: boolean
  maxContextTokens: number
  defaultMaxOutputTokens: number
  envKeyName: string
}

export const PROVIDER_REGISTRY: Record<NexisProvider, ProviderRegistryEntry> = {
  claude: {
    provider: "claude",
    enabled: true,
    displayName: "Anthropic Claude",
    strengths: [
      "long-form system instructions",
      "codex writing",
      "deep document synthesis",
      "architectural reasoning",
      "IDE and build workflows",
    ],
    // Spec §9: Claude → architecture, long-form, codex, proposals
    defaultTaskTypes: ["architecture", "proposal", "general"],
    fallbackProvider: "openai",
    supportsCitations: false,
    supportsTools: true,
    supportsStreaming: true,
    supportsFileInput: true,
    costClass: "high",
    latencyClass: "medium",
    maxContextTokens: 200000,
    defaultMaxOutputTokens: 8096,
    envKeyName: "ANTHROPIC_API_KEY",
  },

  openai: {
    provider: "openai",
    enabled: true,
    displayName: "OpenAI GPT",
    strengths: [
      "structured internal agents",
      "function calling",
      "tool-connected orchestration",
      "file-aware internal actions",
      "workflow execution",
    ],
    // Spec §9: OpenAI → workflow, knowledge_lookup, meeting_recap
    defaultTaskTypes: ["workflow", "knowledge_lookup", "meeting_recap", "content"],
    fallbackProvider: "claude",
    supportsCitations: false,
    supportsTools: true,
    supportsStreaming: true,
    supportsFileInput: true,
    costClass: "medium",
    latencyClass: "fast",
    maxContextTokens: 128000,
    defaultMaxOutputTokens: 4096,
    envKeyName: "OPENAI_API_KEY",
  },

  gemini: {
    provider: "gemini",
    enabled: true,
    displayName: "Google Gemini",
    strengths: [
      "URL and context-heavy reasoning",
      "code execution",
      "Google-connected analysis",
      "multimodal inputs",
      "grounding with search",
    ],
    // Spec §9: Gemini → grounding, code
    defaultTaskTypes: ["grounding", "code"],
    fallbackProvider: "openai",
    supportsCitations: false,
    supportsTools: true,
    supportsStreaming: true,
    supportsFileInput: true,
    costClass: "low",
    latencyClass: "fast",
    maxContextTokens: 1000000,
    defaultMaxOutputTokens: 8192,
    envKeyName: "GEMINI_API_KEY",
  },

  perplexity: {
    provider: "perplexity",
    enabled: true,
    displayName: "Perplexity Sonar",
    strengths: [
      "real-time web search",
      "citation-heavy synthesis",
      "current information retrieval",
      "discovery and fact-finding",
    ],
    // Spec §9: Perplexity → research, requiresCitations
    defaultTaskTypes: ["research"],
    fallbackProvider: "claude",
    supportsCitations: true,
    supportsTools: false,
    supportsStreaming: true,
    supportsFileInput: false,
    costClass: "medium",
    latencyClass: "medium",
    maxContextTokens: 127072,
    defaultMaxOutputTokens: 4096,
    envKeyName: "PERPLEXITY_API_KEY",
  },
}

export function getDefaultProviderForTask(taskType: NexisTaskType): NexisProvider {
  for (const [providerId, entry] of Object.entries(PROVIDER_REGISTRY)) {
    if (entry.enabled && entry.defaultTaskTypes.includes(taskType)) {
      return providerId as NexisProvider
    }
  }
  return "claude"
}

export function getCapableProviders(taskType: NexisTaskType): NexisProvider[] {
  return Object.entries(PROVIDER_REGISTRY)
    .filter(([, e]) => e.enabled && e.defaultTaskTypes.includes(taskType))
    .map(([id]) => id as NexisProvider)
}

export function getProviderEntry(provider: NexisProvider): ProviderRegistryEntry {
  return PROVIDER_REGISTRY[provider]
}

export const getProviderProfile = getProviderEntry
