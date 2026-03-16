/**
 * Base adapter pattern for all grant engine agents.
 *
 * Every adapter must return an AgentOutput that conforms to the shared
 * output standard defined in the skills index. The structured_output field
 * carries agent-specific data. The handoff_payload carries the normalized
 * object for downstream agents.
 *
 * When implementing a real adapter, call the Claude API here using the
 * agent's skill file as the system prompt and the input as the user turn.
 */

import type { AgentOutput, ConfidenceLevel } from "@/types";

export function stubOutput(
  summary: string,
  confidence: ConfidenceLevel = "low"
): AgentOutput {
  return {
    summary,
    assumptions: ["This is a stub — replace with real Claude API call"],
    missing_information: [],
    recommendations: [],
    structured_output: {},
    handoff_payload: {},
    confidence_level: confidence,
  };
}

export type AgentAdapter = (
  input: Record<string, unknown>
) => Promise<AgentOutput>;
