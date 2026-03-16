import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runRevisionManager(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "revision_manager", input });
}
