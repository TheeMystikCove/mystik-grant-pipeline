import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes — Claude pipeline agents can take 60-90s each
export const maxDuration = 300;
import { runAgent } from "@/lib/agents/orchestrator";
import type { AgentName } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalProjectId, agentName, input } = body as {
      proposalProjectId: string;
      agentName: AgentName;
      input: Record<string, unknown>;
    };

    if (!proposalProjectId || !agentName) {
      return NextResponse.json(
        { error: "proposalProjectId and agentName are required" },
        { status: 400 }
      );
    }

    const result = await runAgent({ proposalProjectId, agentName, input: input ?? {} });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
