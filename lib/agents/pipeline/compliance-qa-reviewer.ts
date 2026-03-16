import { callAgent } from "@/lib/claude/call-agent";
import type { AgentOutput } from "@/types";

export async function runComplianceQAReviewer(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  return callAgent({ agentName: "compliance_qa_reviewer", input });
}
