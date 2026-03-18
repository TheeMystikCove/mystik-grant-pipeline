"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatePriorityScore } from "@/lib/scoring/priority-score";

export async function startProposal(formData: FormData) {
  const supabase = await createServerClient();
  const opportunityId = formData.get("opportunity_id") as string;

  // Get current user's org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: userRow }, { data: opp }] = await Promise.all([
    supabase
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single(),
    supabase
      .from("opportunities")
      .select("name")
      .eq("id", opportunityId)
      .single(),
  ]);

  if (!userRow?.organization_id) {
    throw new Error("User has no organization — cannot create proposal.");
  }

  const { data: proposal, error } = await supabase
    .from("proposal_projects")
    .insert({
      organization_id: userRow.organization_id,
      opportunity_id: opportunityId,
      project_name: opp?.name ?? "Untitled Proposal",
      status: "draft",
    })
    .select()
    .single();

  if (error || !proposal) {
    throw new Error(`Failed to create proposal: ${error?.message}`);
  }

  redirect(`/proposals/${proposal.id}`);
}

export async function scoreOpportunity(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const opportunityId = formData.get("opportunity_id") as string;
    if (!opportunityId) return { error: "Missing opportunity ID." };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const strategic_fit = Number(formData.get("strategic_fit") ?? 5);
    const eligibility_confidence = Number(formData.get("eligibility_confidence") ?? 5);
    const internal_readiness = Number(formData.get("internal_readiness") ?? 5);
    const value_vs_effort = Number(formData.get("value_vs_effort") ?? 5);
    const deadline_urgency = Number(formData.get("deadline_urgency") ?? 5);
    const rationale = (formData.get("rationale") as string | null)?.trim() ?? null;

    const result = calculatePriorityScore({
      strategic_fit,
      eligibility_confidence,
      internal_readiness,
      value_vs_effort,
      deadline_urgency,
    });

    const admin = createAdminClient();

    // Delete existing score if any, then insert fresh
    await admin.from("opportunity_scores").delete().eq("opportunity_id", opportunityId);

    const { error } = await admin.from("opportunity_scores").insert({
      opportunity_id: opportunityId,
      strategic_fit_score: result.strategic_fit_score,
      eligibility_score: result.eligibility_score,
      readiness_score: result.readiness_score,
      award_value_score: result.award_value_score,
      urgency_score: result.urgency_score,
      total_score: result.total_score,
      label: result.label,
      rationale,
    });

    if (error) return { error: error.message };

    revalidatePath(`/opportunities/${opportunityId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save score." };
  }
}
