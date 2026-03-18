"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function completeOnboarding(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) {
    redirect("/onboarding?error=Name+is+required.");
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const organizationId = user.user_metadata?.organization_id ?? null;
  const role = (user.user_metadata?.role as string) ?? "member";

  const admin = createAdminClient();
  const { error } = await admin.from("users").insert({
    auth_user_id: user.id,
    email: user.email,
    full_name: fullName,
    role,
    organization_id: organizationId,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
