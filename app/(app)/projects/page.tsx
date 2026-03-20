import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import type { Project } from "@/types";

async function getProjects(orgId: string): Promise<Project[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", orgId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  return (data ?? []) as Project[];
}

export default async function ProjectsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let orgId: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .single();
    orgId = data?.organization_id ?? null;
  }

  const projects = orgId ? await getProjects(orgId) : [];

  return (
    <>
      <Topbar
        title="Projects"
        subtitle="Documented initiatives awaiting funding"
        action={
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
              textTransform: "uppercase",
            }}
          >
            + New Project
          </a>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        {projects.length === 0 ? (
          <div style={{ maxWidth: "560px", margin: "4rem auto", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>❖</p>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.125rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              No projects yet
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Upload a project brief and NEXIS will extract the details, generate keyword tags, and match it against open grant opportunities.
            </p>
            <a
              href="/projects/new"
              style={{
                display: "inline-block",
                padding: "0.625rem 1.5rem",
                background: "var(--accent)",
                color: "#efe8d6",
                borderRadius: "5px",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Create Your First Project
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "880px" }}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const stageLabel: Record<string, string> = {
    intro: "Getting Started",
    problem: "Defining Problem",
    population: "Target Population",
    outcomes: "Outcomes",
    budget: "Budget",
    timeline: "Timeline",
    complete: "Brief Complete",
  };

  return (
    <a
      href={`/projects/${project.id}`}
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderTop: "1px solid var(--border-accent)",
        borderRadius: "2px",
        padding: "1.25rem",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
        <div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.125rem" }}>
            {project.title}
          </p>
          {project.program_area && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {project.program_area}
              {project.target_population && (
                <span style={{ color: "var(--text-muted)" }}> · {project.target_population}</span>
              )}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, alignItems: "center" }}>
          <span style={{
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: "3px",
            background: project.architect_stage === "complete" ? "#1a2a1a" : "var(--surface-raised)",
            color: project.architect_stage === "complete" ? "var(--success)" : "var(--text-muted)",
            border: `1px solid ${project.architect_stage === "complete" ? "var(--success)" : "var(--border)"}`,
          }}>
            {stageLabel[project.architect_stage] ?? project.architect_stage}
          </span>
        </div>
      </div>

      {project.description && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "0.75rem" }}>
          {project.description}
        </p>
      )}

      {project.tags && project.tags.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {project.tags.slice(0, 6).map((tag) => (
            <span key={tag} style={{ fontSize: "0.6875rem", color: "var(--text-muted)", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1px 7px" }}>
              {tag}
            </span>
          ))}
          {project.tags.length > 6 && (
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>+{project.tags.length - 6} more</span>
          )}
        </div>
      )}
    </a>
  );
}
