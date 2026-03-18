"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Update user profile (full_name) ──────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) return { error: "Full name is required." };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ full_name: fullName })
    .eq("auth_user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  revalidatePath("/", "layout"); // refreshes sidebar name
  return { success: true };
}

// ── Update organization ───────────────────────────────────────────────────────

export async function updateOrganization(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: userRow } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow?.organization_id) return { error: "No organization found." };

  const fields = {
    legal_name: (formData.get("legal_name") as string)?.trim() || undefined,
    display_name: (formData.get("display_name") as string)?.trim() || undefined,
    entity_type: (formData.get("entity_type") as string)?.trim() || undefined,
    mission: (formData.get("mission") as string)?.trim() || undefined,
    vision: (formData.get("vision") as string)?.trim() || undefined,
    geography: (formData.get("geography") as string)?.trim() || undefined,
    annual_budget_range: (formData.get("annual_budget_range") as string)?.trim() || undefined,
  };

  // Use admin client to bypass org_founder_update RLS restriction
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update(fields)
    .eq("id", userRow.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: true };
}

// ── Change password ───────────────────────────────────────────────────────────

export async function changePassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const newPassword = formData.get("new_password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (newPassword !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}
