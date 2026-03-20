"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Update user profile (full_name) ──────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
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
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update profile." };
  }
}

// ── Update organization ───────────────────────────────────────────────────────

export async function updateOrganization(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
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

    const admin = createAdminClient();
    const { error } = await admin
      .from("organizations")
      .update(fields)
      .eq("id", userRow.organization_id);

    if (error) return { error: error.message };

    revalidatePath("/account");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update organization." };
  }
}

// ── Change password ───────────────────────────────────────────────────────────

export async function changePassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update password." };
  }
}

// ── Disconnect Google Calendar ────────────────────────────────────────────────

export async function disconnectGoogle(): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const admin = createAdminClient();
    const { error } = await admin
      .from("users")
      .update({ google_refresh_token: null, google_calendar_id: null })
      .eq("auth_user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to disconnect." };
  }
}

// ── Set preferred Google Calendar ─────────────────────────────────────────────

export async function setGoogleCalendar(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const calendarId = (formData.get("calendar_id") as string)?.trim();
    if (!calendarId) return { error: "Calendar ID is required." };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const admin = createAdminClient();
    const { error } = await admin
      .from("users")
      .update({ google_calendar_id: calendarId })
      .eq("auth_user_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/account");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update calendar." };
  }
}

// ── Update organization AI grant profile ─────────────────────────────────────

export async function updateOrganizationProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const { data: userRow } = await supabase
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!userRow?.organization_id) return { error: "No organization found." };

    const orgId = userRow.organization_id;

    const targetPopulations = (formData.get("target_populations") as string ?? "")
      .split("\n").map((s) => s.trim()).filter(Boolean);
    const strategicPriorities = (formData.get("strategic_priorities") as string ?? "")
      .split("\n").map((s) => s.trim()).filter(Boolean);
    const readinessNotes = (formData.get("readiness_notes") as string ?? "").trim() || null;

    const registrations: Record<string, string> = {};
    for (const key of ["ein", "sam_uei", "grants_gov", "state_charity"]) {
      const val = (formData.get(`reg_${key}`) as string ?? "").trim();
      if (val) registrations[key] = val;
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("organization_profiles")
      .upsert(
        {
          organization_id: orgId,
          target_populations_json: targetPopulations,
          strategic_priorities_json: strategicPriorities,
          readiness_notes: readinessNotes,
          registrations_json: registrations,
        },
        { onConflict: "organization_id" }
      );

    if (error) return { error: error.message };

    revalidatePath("/account");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update AI profile." };
  }
}

// ── Invite team member ────────────────────────────────────────────────────────

export async function inviteTeamMember(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const email = (formData.get("invite_email") as string)?.trim().toLowerCase();
    const inviteRole = (formData.get("invite_role") as string) ?? "member";

    if (!email) return { error: "Email is required." };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const { data: inviter } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!inviter) return { error: "User record not found." };
    if (inviter.role !== "founder_admin") return { error: "Only founder admins can send invitations." };
    if (!inviter.organization_id) return { error: "No organization found." };

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grant-engine.vercel.app";
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { organization_id: inviter.organization_id, role: inviteRole },
      redirectTo: `${SITE_URL}/auth/callback?next=/onboarding`,
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send invitation." };
  }
}
