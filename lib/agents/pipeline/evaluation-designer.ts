import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runEvaluationDesigner(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "evaluation_designer", input });
}
