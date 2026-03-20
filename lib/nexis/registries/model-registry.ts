// NEXIS Model Registry
// Maps providers to their available models with routing tiers.
// Update model names here only — not scattered across adapters.

import type { NexisProvider } from "../schemas/ai-request"

export type ModelTier = "flagship" | "balanced" | "fast"
export type MaxContextClass = "small" | "medium" | "large" | "xlarge"

export interface ModelProfile {
  id: string
  provider: NexisProvider
  tier: ModelTier
  displayName: string
  enabled: boolean
  contextWindow: number
  maxOutputTokens: number
  supportsVision: boolean
  supportsTools: boolean
  supportsStructuredOutput: boolean
  maxContextClass: MaxContextClass
  costPer1kInputTokens: number // USD
  costPer1kOutputTokens: number // USD
}

export const MODEL_REGISTRY: ModelProfile[] = [
  // ─── Claude ───────────────────────────────────────────
  {
    id: "claude-opus-4-6",
    provider: "claude",
    tier: "flagship",
    displayName: "Claude Opus 4.6",
    enabled: true,
    contextWindow: 200000,
    maxOutputTokens: 32000,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "xlarge",
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
  },
  {
    id: "claude-sonnet-4-6",
    provider: "claude",
    tier: "balanced",
    displayName: "Claude Sonnet 4.6",
    enabled: true,
    contextWindow: 200000,
    maxOutputTokens: 8096,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "xlarge",
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
  },
  {
    id: "claude-haiku-4-5-20251001",
    provider: "claude",
    tier: "fast",
    displayName: "Claude Haiku 4.5",
    enabled: true,
    contextWindow: 200000,
    maxOutputTokens: 8096,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "xlarge",
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
  },

  // ─── OpenAI ───────────────────────────────────────────
  {
    id: "gpt-4o",
    provider: "openai",
    tier: "flagship",
    displayName: "GPT-4o",
    enabled: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "large",
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    tier: "fast",
    displayName: "GPT-4o Mini",
    enabled: true,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "large",
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
  },

  // ─── Gemini ───────────────────────────────────────────
  {
    id: "gemini-2.0-flash",
    provider: "gemini",
    tier: "balanced",
    displayName: "Gemini 2.0 Flash",
    enabled: true,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "xlarge",
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
  },
  {
    id: "gemini-1.5-pro",
    provider: "gemini",
    tier: "flagship",
    displayName: "Gemini 1.5 Pro",
    enabled: true,
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    maxContextClass: "xlarge",
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
  },

  // ─── Perplexity ───────────────────────────────────────
  {
    id: "sonar-pro",
    provider: "perplexity",
    tier: "flagship",
    displayName: "Sonar Pro",
    enabled: true,
    contextWindow: 127072,
    maxOutputTokens: 8000,
    supportsVision: false,
    supportsTools: false,
    supportsStructuredOutput: false,
    maxContextClass: "large",
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
  },
  {
    id: "sonar",
    provider: "perplexity",
    tier: "fast",
    displayName: "Sonar",
    enabled: true,
    contextWindow: 127072,
    maxOutputTokens: 8000,
    supportsVision: false,
    supportsTools: false,
    supportsStructuredOutput: false,
    maxContextClass: "large",
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.001,
  },
]

/** Get all models for a provider */
export function getModelsForProvider(provider: NexisProvider): ModelProfile[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider)
}

/** Get default (balanced or flagship) model for a provider */
export function getDefaultModel(provider: NexisProvider): ModelProfile {
  const models = getModelsForProvider(provider)
  return (
    models.find((m) => m.tier === "balanced") ??
    models.find((m) => m.tier === "flagship") ??
    models[0]
  )
}

/** Get a specific model by ID */
export function getModel(modelId: string): ModelProfile | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId)
}

/** Get the fastest (cheapest) model for a provider */
export function getFastModel(provider: NexisProvider): ModelProfile {
  const models = getModelsForProvider(provider)
  return (
    models.find((m) => m.tier === "fast") ??
    models[0]
  )
}
