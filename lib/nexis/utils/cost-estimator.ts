// Cost estimation utilities

import { getModel } from "../registries/model-registry"
import type { NexisTokenUsage } from "../schemas/ai-response"

/**
 * Estimates cost in USD for a given model and token usage.
 */
export function estimateCost(
  modelId: string,
  usage: NexisTokenUsage
): number | undefined {
  const model = getModel(modelId)
  if (!model) return undefined

  const inputCost = (usage.inputTokens / 1000) * model.costPer1kInputTokens
  const outputCost = (usage.outputTokens / 1000) * model.costPer1kOutputTokens

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000 // 6 decimal places
}

/**
 * Rough token count estimate from character count.
 * ~4 chars per token is a standard approximation.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
