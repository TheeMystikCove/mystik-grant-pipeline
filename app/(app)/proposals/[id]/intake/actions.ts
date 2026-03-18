"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveIntake(
  proposalProjectId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  // Build the snapshot from all form fields
  const snapshot: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "proposal_project_id") continue;
    const str = value.toString().trim();
    if (str !== "") snapshot[key] = str;
  }

  // Check if a record already exists
  const { data: existing } = await supabase
    .from("project_intake")
    .select("id")
    .eq("proposal_project_id", proposalProjectId)
    .single();

  const payload = {
    proposal_project_id: proposalProjectId,
    project_snapshot_json: snapshot,
    problem_summary: (snapshot.problem_statement as string) ?? null,
    initial_program_idea: (snapshot.program_concept as string) ?? null,
    missing_information_json: [],
    assumptions_json: [],
    updated_at: new Date().toISOString(),
  };

  let error;
  if (existing?.id) {
    ({ error } = await supabase
      .from("project_intake")
      .update(payload)
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("project_intake").insert(payload));
  }

  if (error) return { success: false, error: error.message };

  revalidatePath(`/proposals/${proposalProjectId}`);
  revalidatePath(`/proposals/${proposalProjectId}/intake`);
  return { success: true };
}
