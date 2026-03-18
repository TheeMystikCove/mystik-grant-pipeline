import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { AccountSettingsClient } from "./AccountSettingsClient";

interface PageProps {
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
}

async function getAccountData() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRow } = await supabase
    .from("users")
    .select("full_name, email, role, organization_id, google_refresh_token, google_calendar_id")
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
    googleConnected: !!(userRow as Record<string, unknown>).google_refresh_token,
    googleCalendarId: ((userRow as Record<string, unknown>).google_calendar_id as string | null) ?? null,
  };
}

export default async function AccountPage({ searchParams }: PageProps) {
  const { fullName, email, role, org, googleConnected, googleCalendarId } =
    await getAccountData();
  const params = await searchParams;
  const initialTab = params.tab ?? "profile";
  const feedbackFromUrl =
    params.error || params.success
      ? { error: params.error, success: params.success }
      : undefined;

  return (
    <>
      <Topbar title="Account Settings" subtitle="Manage your profile, organization, and security" />
      <main style={{ flex: 1, overflowY: "auto", padding: "2rem 1.75rem" }}>
        <AccountSettingsClient
          fullName={fullName}
          email={email}
          role={role}
          org={org}
          initialTab={initialTab}
          googleConnected={googleConnected}
          googleCalendarId={googleCalendarId}
          feedbackFromUrl={feedbackFromUrl}
        />
      </main>
    </>
  );
}
