import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runGrantOpportunityScout(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "grant_opportunity_scout", input });
}
