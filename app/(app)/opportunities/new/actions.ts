"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { OpportunitySchema } from "@/lib/validation/schemas";
import { syncOpportunityToNotion, recordSyncJob } from "@/lib/notion/sync";

export async function createOpportunity(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow?.organization_id) {
    throw new Error("No organization found for this user.");
  }

  const raw = {
    name: formData.get("name") as string,
    funder_name: formData.get("funder_name") as string,
    funder_type: (formData.get("funder_type") as string) || null,
    program_area: (formData.get("program_area") as string) || null,
    award_min: formData.get("award_min") ? Number(formData.get("award_min")) : null,
    award_max: formData.get("award_max") ? Number(formData.get("award_max")) : null,
    deadline: (formData.get("deadline") as string) || null,
    geography: (formData.get("geography") as string) || null,
    source_url: (formData.get("source_url") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const { data: opp, error } = await supabase
    .from("opportunities")
    .insert({
      organization_id: userRow.organization_id,
      status: "pursuing",
      ...raw,
    })
    .select()
    .single();

  if (error || !opp) {
    throw new Error(`Failed to save opportunity: ${error?.message}`);
  }

  // Mirror to Notion — fire and forget (don't block redirect on sync failure)
  syncOpportunityToNotion(opp.id)
    .then(({ notionPageId }) =>
      recordSyncJob({
        organizationId: userRow.organization_id!,
        syncType: "opportunity",
        notionTargetId: notionPageId,
      })
    )
    .catch((err) => console.error("[notion] opportunity sync failed:", err));

  redirect(`/opportunities/${opp.id}`);
}
