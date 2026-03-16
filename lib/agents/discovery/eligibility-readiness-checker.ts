import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runEligibilityReadinessChecker(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "eligibility_readiness_checker", input });
}
