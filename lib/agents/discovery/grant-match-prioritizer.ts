import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runGrantMatchPrioritizer(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "grant_match_prioritizer", input });
}
