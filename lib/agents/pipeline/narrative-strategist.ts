import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runNarrativeStrategist(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "narrative_strategist", input });
}
