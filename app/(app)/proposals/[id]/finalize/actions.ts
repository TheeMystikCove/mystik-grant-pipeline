"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  syncProposalStatusToNotion,
  syncReviewChecklistToNotion,
  syncFinalSummaryToNotion,
  recordSyncJob,
} from "@/lib/notion/sync";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrgId(proposalProjectId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("proposal_projects")
    .select("organization_id")
    .eq("id", proposalProjectId)
    .single();
  return data?.organization_id ?? null;
}

export async function markSubmitted(formData: FormData) {
  const supabase = await createServerClient();
  const proposalProjectId = formData.get("proposal_project_id") as string;

  await supabase
    .from("proposal_projects")
    .update({ status: "finalized" })
    .eq("id", proposalProjectId);

  // Sync final summary + review checklist to Notion — fire and forget
  getOrgId(proposalProjectId)
    .then(async (orgId) => {
      if (!orgId) return;
      const [finalResult, reviewResult] = await Promise.all([
        syncFinalSummaryToNotion(proposalProjectId),
        syncReviewChecklistToNotion(proposalProjectId),
      ]);
      await Promise.all([
        recordSyncJob({ organizationId: orgId, proposalProjectId, syncType: "final_summary", notionTargetId: finalResult.notionPageId }),
        recordSyncJob({ organizationId: orgId, proposalProjectId, syncType: "review_checklist", notionTargetId: reviewResult.notionPageId }),
      ]);
    })
    .catch((err: unknown) => console.error("[notion] finalize sync failed:", err));

  revalidatePath(`/proposals/${proposalProjectId}`);
  revalidatePath(`/proposals/${proposalProjectId}/finalize`);
}

export async function runFullPipeline(formData: FormData) {
  const proposalProjectId = formData.get("proposal_project_id") as string;

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run-pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposalProjectId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pipeline failed: ${body}`);
  }

  // Sync proposal status + review checklist to Notion after pipeline — fire and forget
  getOrgId(proposalProjectId)
    .then(async (orgId) => {
      if (!orgId) return;
      const [statusResult, reviewResult] = await Promise.all([
        syncProposalStatusToNotion(proposalProjectId),
        syncReviewChecklistToNotion(proposalProjectId),
      ]);
      await Promise.all([
        recordSyncJob({ organizationId: orgId, proposalProjectId, syncType: "proposal_status", notionTargetId: statusResult.notionPageId }),
        recordSyncJob({ organizationId: orgId, proposalProjectId, syncType: "review_checklist", notionTargetId: reviewResult.notionPageId }),
      ]);
    })
    .catch((err: unknown) => console.error("[notion] pipeline sync failed:", err));

  revalidatePath(`/proposals/${proposalProjectId}`);
  redirect(`/proposals/${proposalProjectId}/finalize`);
}
