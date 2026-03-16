import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runProgramArchitect(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "program_architect", input });
}
