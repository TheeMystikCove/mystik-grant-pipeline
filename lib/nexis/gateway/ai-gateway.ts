// NEXIS_OS_SERVICE_AI_GATEWAY_V1
// The central orchestration point for all NEXIS AI requests.
// Receives normalized requests → routes → executes → logs → returns unified response.

import { routeRequest } from "../router/provider-router"
import { enforceAgentPolicy } from "../agents/agent-policy"
import { getDefaultModel } from "../registries/model-registry"
import { logExecution } from "../logging/execution-logger"
import { fetchCanonContext } from "../knowledge/canon-context"
import { runClaudeAdapter } from "../providers/adapter-claude"
import { runOpenAIAdapter } from "../providers/adapter-openai"
import { runGeminiAdapter } from "../providers/adapter-gemini"
import { runPerplexityAdapter } from "../providers/adapter-perplexity"
import type { NexisAIRequest, NexisProvider } from "../schemas/ai-request"
import type { NexisAIResponse } from "../schemas/ai-response"
import type { RoutingResult } from "../schemas/routing-result"

type AdapterFn = (
  request: NexisAIRequest,
  routing: RoutingResult,
  agentSystemPrompt?: string
) => Promise<NexisAIResponse>

const ADAPTERS: Record<NexisProvider, AdapterFn> = {
  claude: runClaudeAdapter,
  openai: runOpenAIAdapter,
  gemini: runGeminiAdapter,
  perplexity: runPerplexityAdapter,
}

/**
 * Main gateway entry point.
 * Call this from any API route or server action.
 */
export async function executeAIRequest(
  request: NexisAIRequest,
  agentSystemPrompt?: string
): Promise<NexisAIResponse> {
  // ── 1. Route the request ─────────────────────────────────────────────
  const routing = routeRequest(request)

  // ── 1.5. Fetch canon context and merge into system prompt ─────────────
  const canonResult = await fetchCanonContext(request)
  const resolvedSystemPrompt = canonResult.skipped
    ? agentSystemPrompt
    : [agentSystemPrompt, canonResult.systemPromptBlock].filter(Boolean).join("\n\n")

  // ── 2. Enforce agent-level policy restrictions ───────────────────────
  const policyResult = enforceAgentPolicy(
    request.agentName,
    routing.selectedProvider
  )

  let finalRouting = routing

  if (policyResult.overrideApplied) {
    const overrideProvider = policyResult.provider
    const overrideModel = getDefaultModel(overrideProvider)
    finalRouting = {
      ...routing,
      selectedProvider: overrideProvider,
      selectedModel: overrideModel.id,
      rationale: `${routing.rationale} | POLICY OVERRIDE: ${policyResult.reason}`,
    }
  }

  // ── 3. Execute primary adapter ───────────────────────────────────────
  const adapter = ADAPTERS[finalRouting.selectedProvider]
  let response = await adapter(request, finalRouting, resolvedSystemPrompt)

  // ── 4. Fallback on error ─────────────────────────────────────────────
  if (!response.success) {
    const fallbackProvider = finalRouting.fallbackProvider
    const fallbackAdapter = ADAPTERS[fallbackProvider]
    const fallbackModel = getDefaultModel(fallbackProvider)

    const fallbackRouting: RoutingResult = {
      ...finalRouting,
      selectedProvider: fallbackProvider,
      selectedModel: fallbackModel.id,
      rationale: `${finalRouting.rationale} | FALLBACK from ${finalRouting.selectedProvider}: ${response.error}`,
    }

    const fallbackResponse = await fallbackAdapter(
      request,
      fallbackRouting,
      resolvedSystemPrompt
    )

    response = {
      ...fallbackResponse,
      fallbackProvider: finalRouting.selectedProvider,
    }

    // Log with fallback routing
    void logExecution(request, response, fallbackRouting)
    return response
  }

  // ── 5. Log successful execution (fire-and-forget) ───────────────────
  void logExecution(request, response, finalRouting)

  return response
}
