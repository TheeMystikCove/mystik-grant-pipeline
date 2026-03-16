import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runGrantRequirementsParser(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "grant_requirements_parser", input });
}
