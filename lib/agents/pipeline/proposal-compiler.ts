import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runProposalCompiler(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "proposal_compiler", input });
}
