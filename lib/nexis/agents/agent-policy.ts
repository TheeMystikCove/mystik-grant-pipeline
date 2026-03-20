// Agent Policy — enforces per-agent provider restrictions from the agent registry
// Spec: section 13 — AgentPolicy type and enforcement rules.

import type { NexisProvider, NexisTaskType } from "../schemas/ai-request"

export interface AgentPolicy {
  agentName: string
  domain: string                        // required
  defaultProvider: NexisProvider        // required
  fallbackProvider?: NexisProvider      // optional — agent-level fallback
  allowedProviders: NexisProvider[]     // required — empty array = no restriction
  preferredTaskTypes: NexisTaskType[]   // required
  requiresCitations?: boolean
  sensitivity?: "low" | "medium" | "high"
}

const AGENT_POLICIES: AgentPolicy[] = [
  // ── NEXIS Core agents ──────────────────────────────────────────
  {
    agentName: "NEXIS_CORE_AGENT_CANON_ORGANIZER_V1",
    domain: "CORE",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["architecture", "knowledge_lookup"],
    requiresCitations: false,
  },
  {
    agentName: "NEXIS_CORE_AGENT_LUMEN_FORGE_V1",
    domain: "CORE",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["architecture", "content"],
  },
  {
    agentName: "NEXIS_CORE_AGENT_TRAUMA_QA_V1",
    domain: "CORE",
    defaultProvider: "claude",
    fallbackProvider: "claude",
    allowedProviders: ["claude"],
    preferredTaskTypes: ["knowledge_lookup", "general"],
    sensitivity: "high",
  },

  // ── Academy agents ─────────────────────────────────────────────
  {
    agentName: "NEXIS_ACADEMY_AGENT_CURRICULUM_ARCHITECT_V1",
    domain: "ACADEMY",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["architecture", "content"],
  },
  {
    agentName: "NEXIS_ACADEMY_AGENT_STUDENT_EXPERIENCE_V1",
    domain: "ACADEMY",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["content", "knowledge_lookup"],
    sensitivity: "high",
  },

  // ── Studios agents ─────────────────────────────────────────────
  {
    agentName: "NEXIS_STUDIOS_AGENT_PUBLISHING_V1",
    domain: "STUDIOS",
    defaultProvider: "openai",
    fallbackProvider: "claude",
    allowedProviders: [],
    preferredTaskTypes: ["content", "workflow"],
  },
  {
    agentName: "NEXIS_STUDIOS_AGENT_SEO_STRATEGIST_V1",
    domain: "STUDIOS",
    defaultProvider: "perplexity",
    fallbackProvider: "claude",
    allowedProviders: [],
    preferredTaskTypes: ["research", "content"],
    requiresCitations: true,
  },

  // ── Grant Engine agents ─────────────────────────────────────────
  {
    agentName: "grant_opportunity_scout",
    domain: "OPS",
    defaultProvider: "perplexity",
    fallbackProvider: "claude",
    allowedProviders: [],
    preferredTaskTypes: ["research"],
    requiresCitations: true,
  },
  {
    agentName: "intake_orchestrator",
    domain: "OPS",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["workflow", "architecture"],
  },
  {
    agentName: "narrative_strategist",
    domain: "OPS",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["proposal", "content"],
  },
  {
    agentName: "compliance_qa_reviewer",
    domain: "OPS",
    defaultProvider: "claude",
    fallbackProvider: "openai",
    allowedProviders: [],
    preferredTaskTypes: ["knowledge_lookup", "general"],
  },
]

const POLICY_MAP = new Map<string, AgentPolicy>(
  AGENT_POLICIES.map((p) => [p.agentName, p])
)

export function getAgentPolicy(agentName: string): AgentPolicy | undefined {
  return POLICY_MAP.get(agentName)
}

/**
 * Applies agent policy constraints to a routing decision.
 */
export function enforceAgentPolicy(
  agentName: string | undefined,
  routedProvider: NexisProvider
): {
  provider: NexisProvider
  overrideApplied: boolean
  reason?: string
} {
  if (!agentName) {
    return { provider: routedProvider, overrideApplied: false }
  }

  const policy = getAgentPolicy(agentName)
  if (!policy) {
    return { provider: routedProvider, overrideApplied: false }
  }

  if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(routedProvider)) {
    const enforced = policy.allowedProviders[0]
    return {
      provider: enforced,
      overrideApplied: true,
      reason: `Agent ${agentName} is restricted to: ${policy.allowedProviders.join(", ")}`,
    }
  }

  return { provider: routedProvider, overrideApplied: false }
}
