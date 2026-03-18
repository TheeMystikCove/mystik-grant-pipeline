import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { IntakeFormClient } from "./IntakeFormClient";

async function getIntakeData(proposalId: string) {
  const supabase = await createServerClient();

  const [{ data: proposal }, { data: intake }] = await Promise.all([
    supabase
      .from("proposal_projects")
      .select("*, opportunities(name, funder_name, deadline, award_max, geography, program_area)")
      .eq("id", proposalId)
      .single(),
    supabase
      .from("project_intake")
      .select("project_snapshot_json")
      .eq("proposal_project_id", proposalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return { proposal, snapshot: (intake?.project_snapshot_json ?? {}) as Record<string, string> };
}

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { proposal, snapshot } = await getIntakeData(id);

  if (!proposal) notFound();

  const opp = proposal.opportunities as any;

  // Pre-fill from opportunity data where snapshot is empty
  const initial: Record<string, string> = {
    funder_name: opp?.funder_name ?? "",
    geographic_area: opp?.geography ?? "",
    application_deadline: opp?.deadline ? new Date(opp.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
    ...snapshot,
  };

  return (
    <>
      <Topbar
        title="Proposal Intake Form"
        subtitle={opp?.name ?? proposal.project_name}
        action={
          <Link
            href={`/proposals/${id}`}
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.375rem 0.75rem",
            }}
          >
            ← Back to Workspace
          </Link>
        }
      />

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Banner explaining the purpose */}
        <div
          style={{
            background: "var(--surface-accent)",
            borderBottom: "1px solid var(--border-accent)",
            padding: "0.75rem 1.5rem",
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--accent)" }}>Pipeline Data</strong> — Fill in as much as possible before running agents. This data feeds every stage of the pipeline. Fields marked <span style={{ color: "var(--danger)" }}>*</span> are required for a submission-ready proposal.
        </div>

        <IntakeFormClient proposalProjectId={id} initial={initial} />
      </div>
    </>
  );
}
