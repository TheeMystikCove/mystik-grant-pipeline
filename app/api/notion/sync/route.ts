import { NextRequest, NextResponse } from "next/server";
import {
  syncOpportunityToNotion,
  syncProposalStatusToNotion,
  syncReviewChecklistToNotion,
  syncFinalSummaryToNotion,
  recordSyncJob,
} from "@/lib/notion/sync";
import { createAdminClient } from "@/lib/supabase/admin";

type SyncType = "opportunity" | "proposal_status" | "review_checklist" | "final_summary";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { syncType, opportunityId, proposalProjectId } = body as {
      syncType: SyncType;
      opportunityId?: string;
      proposalProjectId?: string;
    };

    if (!syncType) {
      return NextResponse.json({ error: "syncType is required" }, { status: 400 });
    }

    let notionPageId: string;
    let orgId: string | null = null;

    // Resolve org ID for job tracking
    const supabase = createAdminClient();
    if (proposalProjectId) {
      const { data } = await supabase
        .from("proposal_projects")
        .select("organization_id")
        .eq("id", proposalProjectId)
        .single();
      orgId = data?.organization_id ?? null;
    } else if (opportunityId) {
      const { data } = await supabase
        .from("opportunities")
        .select("organization_id")
        .eq("id", opportunityId)
        .single();
      orgId = data?.organization_id ?? null;
    }

    switch (syncType) {
      case "opportunity": {
        if (!opportunityId) {
          return NextResponse.json({ error: "opportunityId required for opportunity sync" }, { status: 400 });
        }
        const result = await syncOpportunityToNotion(opportunityId);
        notionPageId = result.notionPageId;
        break;
      }
      case "proposal_status": {
        if (!proposalProjectId) {
          return NextResponse.json({ error: "proposalProjectId required" }, { status: 400 });
        }
        const result = await syncProposalStatusToNotion(proposalProjectId);
        notionPageId = result.notionPageId;
        break;
      }
      case "review_checklist": {
        if (!proposalProjectId) {
          return NextResponse.json({ error: "proposalProjectId required" }, { status: 400 });
        }
        const result = await syncReviewChecklistToNotion(proposalProjectId);
        notionPageId = result.notionPageId;
        break;
      }
      case "final_summary": {
        if (!proposalProjectId) {
          return NextResponse.json({ error: "proposalProjectId required" }, { status: 400 });
        }
        const result = await syncFinalSummaryToNotion(proposalProjectId);
        notionPageId = result.notionPageId;
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown syncType: ${syncType}` }, { status: 400 });
    }

    // Record the sync job
    if (orgId) {
      await recordSyncJob({
        organizationId: orgId,
        proposalProjectId,
        syncType,
        notionTargetId: notionPageId,
      });
    }

    return NextResponse.json({ success: true, notionPageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notion/sync]", message);

    // Record error in sync jobs if we have context
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
