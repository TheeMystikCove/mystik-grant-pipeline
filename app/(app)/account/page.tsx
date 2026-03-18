import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { AccountSettingsClient } from "./AccountSettingsClient";

async function getAccountData() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("full_name, email, role, organization_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!userRow) redirect("/login");

  const { data: org } = userRow.organization_id
    ? await supabase
        .from("organizations")
        .select("legal_name, display_name, entity_type, mission, vision, geography, annual_budget_range")
        .eq("id", userRow.organization_id)
        .single()
    : { data: null };

  return {
    fullName: userRow.full_name,
    email: userRow.email,
    role: userRow.role,
    org: org ?? null,
  };
}

export default async function AccountPage() {
  const { fullName, email, role, org } = await getAccountData();

  return (
    <>
      <Topbar title="Account Settings" subtitle="Manage your profile, organization, and security" />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem 1.75rem" }}>
        <AccountSettingsClient
          fullName={fullName}
          email={email}
          role={role}
          org={org}
        />
      </main>
    </>
  );
}
