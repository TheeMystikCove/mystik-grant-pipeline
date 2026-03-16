import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runBudgetArchitect(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "budget_architect", input });
}
