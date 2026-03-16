import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runResearchEvidenceScout(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "research_evidence_scout", input });
}
