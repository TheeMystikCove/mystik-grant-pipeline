import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Topbar } from "@/components/layout/topbar";
import { ProjectDetailClient } from "./ProjectDetailClient";
import type { Project } from "@/types";

async function getProject(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  return data as Project | null;
}

async function getMatchedGrants(projectId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_opportunities")
    .select("*, opportunity:opportunities(id, name, funder_name, program_area, award_min, award_max, deadline, geography, source_url)")
    .eq("project_id", projectId)
    .order("match_score", { ascending: false })
    .limit(20);
  return data ?? [];
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, matchedGrants] = await Promise.all([
    getProject(id),
    getMatchedGrants(id),
  ]);

  if (!project) notFound();

  return (
    <>
      <Topbar
        title={project.title}
        subtitle={project.program_area ?? "Project"}
        action={
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
            <span style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "3px",
              background: project.status === "active" ? "#1a2a1a" : "var(--surface-raised)",
              color: project.status === "active" ? "var(--success)" : "var(--text-muted)",
              border: `1px solid ${project.status === "active" ? "var(--success)" : "var(--border)"}`,
            }}>
              {project.status}
            </span>
            <a
              href="/projects/new"
              style={{
                padding: "0.4375rem 0.875rem",
                background: "var(--accent)",
                color: "#efe8d6",
                borderRadius: "2px",
                fontSize: "0.75rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.05em",
              }}
            >
              + New Project
            </a>
          </div>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        <ProjectDetailClient project={project} matchedGrants={matchedGrants as any} />
      </main>
    </>
  );
}
