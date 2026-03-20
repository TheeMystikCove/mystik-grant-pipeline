import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "@/lib/claude/call-agent";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Load project
  const { data: project } = await supabase
    .from("projects")
    .select("organization_id, title, description, program_area, target_population, tags, estimated_budget")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const tags: string[] = project.tags ?? [];
  const programArea: string = project.program_area ?? "";

  // Build OR filter: program_area contains project area OR any tag appears in name/notes/program_area
  // Use ilike for each tag
  let query = supabase
    .from("opportunities")
    .select("id, funder_name, name, program_area, funder_type, deadline, award_min, award_max, geography, eligibility_text, notes")
    .eq("organization_id", project.organization_id)
    .neq("status", "declined");

  // Apply program area filter if available
  if (programArea) {
    query = query.ilike("program_area", `%${programArea.split(" ")[0]}%`);
  }

  const { data: candidates } = await query.limit(40);
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ matched: 0 });
  }

  // Score top candidates with grant_match_prioritizer, injecting project context
  const toScore = candidates.slice(0, 20);
  const results: Array<{ opportunity_id: string; match_score: number; match_rationale: string }> = [];

  await Promise.allSettled(
    toScore.map(async (opp) => {
      try {
        const output = await callAgent({
          agentName: "grant_match_prioritizer",
          input: {
            opportunity_id: opp.id,
            funder_name: opp.funder_name,
            opportunity_name: opp.name,
            program_area: opp.program_area,
            funder_type: opp.funder_type,
            deadline: opp.deadline,
            award_min: opp.award_min,
            award_max: opp.award_max,
            geography: opp.geography,
            eligibility_text: opp.eligibility_text,
            notes: opp.notes,
            // Project context injected
            project_title: project.title,
            project_description: project.description,
            project_program_area: programArea,
            project_target_population: project.target_population,
            project_tags: tags,
            project_budget: project.estimated_budget,
          },
        });
        const score = output.structured_output;
        results.push({
          opportunity_id: opp.id,
          match_score: Number(score.total_score ?? score.priority_score ?? 0),
          match_rationale: String(score.rationale ?? ""),
        });
      } catch { /* skip this opportunity */ }
    })
  );

  // Filter meaningful matches (score > 0) and upsert
  const rows = results
    .filter((r) => r.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 15)
    .map((r) => ({
      project_id: id,
      opportunity_id: r.opportunity_id,
      match_score: r.match_score,
      match_rationale: r.match_rationale,
      matched_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    await supabase
      .from("project_opportunities")
      .upsert(rows, { onConflict: "project_id,opportunity_id" });
  }

  return NextResponse.json({ matched: rows.length });
}
