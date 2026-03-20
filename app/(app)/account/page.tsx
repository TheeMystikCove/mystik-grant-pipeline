import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { AccountSettingsClient } from "./AccountSettingsClient";

interface PageProps {
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
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

  const { data: orgProfile } = userRow.organization_id
    ? await supabase
        .from("organization_profiles")
        .select("target_populations_json, strategic_priorities_json, readiness_notes, registrations_json")
        .eq("organization_id", userRow.organization_id)
        .single()
    : { data: null };

  let teamMembers: TeamMember[] = [];
  if (userRow.organization_id) {
    const { data: members } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("organization_id", userRow.organization_id)
      .order("created_at", { ascending: true });
    teamMembers = (members ?? []) as TeamMember[];
  }

  return {
    fullName: userRow.full_name,
    email: userRow.email,
    role: userRow.role,
    org: org ?? null,
    orgProfile: orgProfile ?? null,
    googleConnected: !!(userRow as Record<string, unknown>).google_refresh_token,
    googleCalendarId: ((userRow as Record<string, unknown>).google_calendar_id as string | null) ?? null,
    teamMembers,
  };
}

export default async function AccountPage({ searchParams }: PageProps) {
  const { fullName, email, role, org, orgProfile, googleConnected, googleCalendarId, teamMembers } =
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
          orgProfile={orgProfile}
          initialTab={initialTab}
          googleConnected={googleConnected}
          googleCalendarId={googleCalendarId}
          feedbackFromUrl={feedbackFromUrl}
          teamMembers={teamMembers}
        />
      </main>
    </>
  );
}
