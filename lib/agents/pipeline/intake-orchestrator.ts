import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runIntakeOrchestrator(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "intake_orchestrator", input });
}
