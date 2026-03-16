"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function startProposal(formData: FormData) {
  const supabase = await createServerClient();
  const opportunityId = formData.get("opportunity_id") as string;

  // Get current user's org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userRow?.organization_id) {
    throw new Error("User has no organization — cannot create proposal.");
  }

  const { data: proposal, error } = await supabase
    .from("proposal_projects")
    .insert({
      organization_id: userRow.organization_id,
      opportunity_id: opportunityId,
      status: "draft",
    })
    .select()
    .single();

  if (error || !proposal) {
    throw new Error(`Failed to create proposal: ${error?.message}`);
  }

  redirect(`/proposals/${proposal.id}`);
}
