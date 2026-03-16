import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runFinalGrantWriter(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "final_grant_writer", input });
}
