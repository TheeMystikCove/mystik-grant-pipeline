/**
 * Core agent caller for all grant engine pipeline agents.
 *
 * Routes every agent call through the NEXIS AI gateway so each gets:
 *   - Provider routing via agent policy (narrative → claude, scout → perplexity, etc.)
 *   - Canon context injection from the knowledge layer
 *   - Agent policy enforcement (provider restrictions)
 *   - Execution logging to agent_runs
 *
 * The skill .md file is used as the agent system prompt.
 * The gateway appends canon context on top of it automatically.
 */

import { randomUUID } from "crypto"
import { executeAIRequest } from "@/lib/nexis/gateway/ai-gateway"
import { getAgentPolicy } from "@/lib/nexis/agents/agent-policy"
import { loadSkillPrompt } from "./skills"
import type { AgentOutput, ConfidenceLevel } from "@/types"
import type { NexisBranch } from "@/lib/nexis/schemas/ai-request"

const OUTPUT_SCHEMA_INSTRUCTION = `
## Required Output Format

You MUST end your response with a JSON block that conforms exactly to this schema.
Wrap it in triple-backtick json fences:

\`\`\`json
{
  "summary": "<1-3 sentence summary of what you produced>",
  "assumptions": ["<assumption>"],
  "missing_information": ["<missing field or data>"],
  "recommendations": ["<recommendation for downstream agents or the user>"],
  "structured_output": {
    // Agent-specific output goes here.
    // For section-producing agents (narrative, budget, evaluation, compiler, final):
    //   keys are section names, values are the full draft text strings.
    // For analysis agents: keys are whatever structured data this agent produces.
  },
  "handoff_payload": {
    // Normalized data passed to the next agent in the pipeline.
  },
  "confidence_level": "high" | "medium" | "low"
}
\`\`\`

Do not omit any field. Use empty arrays [] for list fields with no items.
Use an empty object {} for structured_output or handoff_payload if not applicable.
`.trim()

export async function callAgent(params: {
  agentName: string
  input: Record<string, unknown>
}): Promise<AgentOutput> {
  const { agentName, input } = params

  // Load skill file as agent system prompt
  const skillPrompt = loadSkillPrompt(agentName)
  const agentSystemPrompt = `${skillPrompt}\n\n---\n\n${OUTPUT_SCHEMA_INSTRUCTION}`

  // Look up routing policy for this agent
  const policy = getAgentPolicy(agentName)
  const taskType = policy?.preferredTaskTypes?.[0] ?? "general"
  const branch = policy?.domain as NexisBranch | undefined

  // Build the user message (serialized context for the agent)
  const userMessage = buildUserMessage(input)

  // Route through the NEXIS gateway — gets canon injection, routing, policy, logging
  const response = await executeAIRequest(
    {
      requestId: randomUUID(),
      agentName,
      taskType,
      prompt: userMessage,
      branch,
      sensitivity: policy?.sensitivity ?? "medium",
      requiresCitations: policy?.requiresCitations ?? false,
      requiresTools: false,
      outputFormat: "text",
      stream: false,
    },
    agentSystemPrompt
  )

  if (!response.success) {
    throw new Error(response.error ?? `Agent ${agentName} failed`)
  }

  return parseAgentOutput(response.output, agentName)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUserMessage(input: Record<string, unknown>): string {
  const parts: string[] = []

  if (input.proposal_project) {
    parts.push(`## Proposal Project\n${JSON.stringify(input.proposal_project, null, 2)}`)
  }
  if (input.intake) {
    parts.push(`## Project Intake\n${JSON.stringify(input.intake, null, 2)}`)
  }
  if (input.prior_outputs && Object.keys(input.prior_outputs as object).length > 0) {
    parts.push(`## Prior Agent Outputs\n${JSON.stringify(input.prior_outputs, null, 2)}`)
  }

  const remaining = Object.fromEntries(
    Object.entries(input).filter(
      ([k]) => !["proposal_project", "intake", "prior_outputs"].includes(k)
    )
  )
  if (Object.keys(remaining).length > 0) {
    parts.push(`## Additional Context\n${JSON.stringify(remaining, null, 2)}`)
  }

  if (parts.length === 0) {
    parts.push("No context provided. Apply your skill using general best practices.")
  }

  return parts.join("\n\n")
}

function parseAgentOutput(raw: string, agentName: string): AgentOutput {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      return normalizeOutput(JSON.parse(jsonMatch[1].trim()))
    } catch { /* fall through */ }
  }

  const bareMatch = raw.match(/\{[\s\S]*"summary"[\s\S]*\}/)
  if (bareMatch) {
    try {
      return normalizeOutput(JSON.parse(bareMatch[0]))
    } catch { /* fall through */ }
  }

  console.warn(`[${agentName}] Could not parse JSON from response — using prose fallback`)
  return {
    summary: raw.slice(0, 500),
    assumptions: ["Output was prose, not structured JSON — review manually"],
    missing_information: [],
    recommendations: [],
    structured_output: { full_response: raw },
    handoff_payload: {},
    confidence_level: "low",
  }
}

function normalizeOutput(raw: Record<string, unknown>): AgentOutput {
  return {
    summary: String(raw.summary ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    missing_information: Array.isArray(raw.missing_information)
      ? raw.missing_information.map(String)
      : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(String)
      : [],
    structured_output: (raw.structured_output as Record<string, unknown>) ?? {},
    handoff_payload: (raw.handoff_payload as Record<string, unknown>) ?? {},
    confidence_level: (["high", "medium", "low"].includes(raw.confidence_level as string)
      ? raw.confidence_level
      : "medium") as ConfidenceLevel,
  }
}
