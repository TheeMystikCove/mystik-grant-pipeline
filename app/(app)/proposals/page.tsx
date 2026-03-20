import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { ProposalsListClient } from "./ProposalsListClient";

async function getProposals() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("proposal_projects")
    .select("*, opportunities(name, funder_name, deadline, award_max)")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return (
    <>
      <Topbar title="Proposals" subtitle={`${proposals.length} active`} />
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        <ProposalsListClient proposals={proposals as any} />
      </main>
    </>
  );
}
