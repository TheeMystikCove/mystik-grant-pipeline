import { NextRequest, NextResponse } from "next/server";
import { searchGrantOpportunities } from "@/lib/opportunities/search";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, keywords, geography, funderType, programArea } = body as {
      organizationId: string;
      keywords: string;
      geography: string;
      funderType: string;
      programArea: string;
    };

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const opportunities = await searchGrantOpportunities({
      organizationId,
      keywords: keywords ?? "",
      geography: geography ?? "",
      funderType: funderType as any,
      programArea: programArea ?? "",
    });

    return NextResponse.json({ opportunities });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[opportunities/search]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
