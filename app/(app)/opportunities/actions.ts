"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteOpportunities(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {};

  // Get the current user's org so we only delete opportunities they own
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: userRow } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow?.organization_id) return { error: "No organization found" };

  // Use admin client to bypass RLS — scoped to this org's opportunities only
  const admin = createAdminClient();
  const { error } = await admin
    .from("opportunities")
    .delete()
    .in("id", ids)
    .eq("organization_id", userRow.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/opportunities");
  return {};
}
