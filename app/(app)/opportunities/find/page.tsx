import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { OpportunityFinderClient } from "./OpportunityFinderClient";

async function getOrgId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();
  return data?.organization_id ?? null;
}

export default async function OpportunityFinderPage() {
  const orgId = await getOrgId();

  return (
    <>
      <Topbar
        title="Find Grants"
        subtitle="AI-powered opportunity scout"
      />
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        {!orgId ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No organization linked to your account. Contact your admin.
          </div>
        ) : (
          <OpportunityFinderClient organizationId={orgId} />
        )}
      </main>
    </>
  );
}
