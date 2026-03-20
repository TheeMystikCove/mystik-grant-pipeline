// NEXIS_OS_AGENT_PROVIDER_ROUTER_V1
// Classifies task intent, selects provider + model, determines fallback,
// and attaches routing rationale. Pure logic — no I/O.

import {
  getDefaultProviderForTask,
  getProviderProfile,
} from "../registries/provider-registry"
import {
  getDefaultModel,
  getFastModel,
} from "../registries/model-registry"
import type { NexisAIRequest, NexisProvider } from "../schemas/ai-request"
import type { RoutingResult } from "../schemas/routing-result"

// Fallback chain — if primary fails, try the next in line
const FALLBACK_MAP: Record<NexisProvider, NexisProvider> = {
  perplexity: "claude",
  gemini: "claude",
  openai: "claude",
  claude: "openai",
}

/**
 * The Provider Router — OS-level routing decision engine.
 * Returns a RoutingResult that the Gateway uses to select an adapter.
 */
export function routeRequest(request: NexisAIRequest): RoutingResult {
  const { taskType, preferredProvider, requiresCitations, requiresTools } =
    request

  // ── Step 1: Determine primary provider ──────────────────────────────
  let selectedProvider: NexisProvider

  if (preferredProvider) {
    // User or agent explicitly requested a provider
    selectedProvider = preferredProvider
  } else if (requiresCitations) {
    // Citations required → Perplexity is the only first-class citation provider
    selectedProvider = "perplexity"
  } else if (taskType === "code" || taskType === "grounding") {
    selectedProvider = "gemini"
  } else {
    selectedProvider = getDefaultProviderForTask(taskType)
  }

  // ── Step 2: Check provider availability (env key exists) ────────────
  const providerAvailable = isProviderAvailable(selectedProvider)
  let fallbackUsed = false

  if (!providerAvailable) {
    const fallback = FALLBACK_MAP[selectedProvider]
    const rationale = buildRationale(
      request,
      selectedProvider,
      `${selectedProvider} key not available; routing to ${fallback}`
    )
    return buildResult(request, fallback, rationale, selectedProvider)
  }

  // ── Step 3: Agent registry restriction enforcement ───────────────────
  // If agentName is set and has a provider restriction, enforce it
  // (enforcement logic is in agent-policy.ts — router defers to it)

  // ── Step 4: Validate provider can meet requirements ──────────────────
  const profile = getProviderProfile(selectedProvider)

  if (requiresTools && !profile.supportsTools) {
    // Requested tools but provider doesn't support them → fallback
    const fallback = FALLBACK_MAP[selectedProvider]
    const rationale = buildRationale(
      request,
      selectedProvider,
      `${selectedProvider} does not support tools; routing to ${fallback}`
    )
    return buildResult(request, fallback, rationale, selectedProvider)
  }

  // ── Step 5: Select model ─────────────────────────────────────────────
  const rationale = buildRationale(request, selectedProvider)

  return buildResult(request, selectedProvider, rationale, FALLBACK_MAP[selectedProvider])
}

// ── Helpers ─────────────────────────────────────────────────────────────

function isProviderAvailable(provider: NexisProvider): boolean {
  const envMap: Record<NexisProvider, string> = {
    claude: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
  }
  const key = envMap[provider]
  return !!(process.env[key] ?? process.env["GOOGLE_AI_API_KEY"])
}

function buildResult(
  request: NexisAIRequest,
  provider: NexisProvider,
  rationale: string,
  fallback: NexisProvider
): RoutingResult {
  const model = getDefaultModel(provider)
  const fallbackModel = getFastModel(fallback)

  return {
    selectedProvider: provider,
    selectedModel: model.id,
    fallbackProvider: fallback,
    fallbackModel: fallbackModel.id,
    rationale,
    taskType: request.taskType,
    requiresTools: request.requiresTools ?? false,
    requiresCitations: request.requiresCitations ?? false,
  }
}

function buildRationale(
  request: NexisAIRequest,
  provider: NexisProvider,
  overrideNote?: string
): string {
  const base = overrideNote
    ? overrideNote
    : `Task type "${request.taskType}" → default provider: ${provider}`

  const extras: string[] = []
  if (request.requiresCitations) extras.push("citations required")
  if (request.requiresTools) extras.push("tools required")
  if (request.preferredProvider) extras.push(`preferred provider specified: ${request.preferredProvider}`)
  if (request.branch) extras.push(`branch: ${request.branch}`)

  return extras.length > 0 ? `${base} [${extras.join(", ")}]` : base
}
