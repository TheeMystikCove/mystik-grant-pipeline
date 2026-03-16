import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runFunderFitAnalyzer(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "funder_fit_analyzer", input });
}
