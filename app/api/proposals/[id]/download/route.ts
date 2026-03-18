import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from "docx";

const SECTION_ORDER = [
  { key: "cover_letter",             label: "Cover Letter" },
  { key: "executive_summary",        label: "Executive Summary" },
  { key: "organization_information", label: "Organization Information" },
  { key: "statement_of_need",        label: "Statement of Need" },
  { key: "goals_and_objectives",     label: "Goals and Objectives" },
  { key: "methods_and_work_plan",    label: "Methods and Work Plan" },
  { key: "evaluation_plan",          label: "Evaluation Plan" },
  { key: "budget_narrative",         label: "Budget Narrative" },
  { key: "sustainability_plan",      label: "Sustainability Plan" },
  { key: "pre_submission_checklist", label: "Pre-Submission Checklist" },
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [{ data: proposal }, { data: sections }] = await Promise.all([
    supabase
      .from("proposal_projects")
      .select("project_name, opportunities(name, funder_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("proposal_sections")
      .select("section_name, draft_text")
      .eq("proposal_project_id", id),
  ]);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const opp = proposal.opportunities as any;
  const projectName =
    opp?.name ?? proposal.project_name ?? "Grant Proposal";
  const funderName = opp?.funder_name ?? "";

  // Build a map of section_name -> draft_text
  const sectionMap: Record<string, string> = {};
  for (const s of sections ?? []) {
    if (s.draft_text) sectionMap[s.section_name] = s.draft_text;
  }

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: projectName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: funderName ? `Submitted to: ${funderName}` : "",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "Prepared by Thee Mystik Universal Holdings Corp.",
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  for (const { key, label } of SECTION_ORDER) {
    const text = sectionMap[key];
    if (!text) continue;

    children.push(
      new Paragraph({
        text: label,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        pageBreakBefore: true,
      })
    );

    for (const para of text.split(/\n\n+/)) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const lines = trimmed.split(/\n/);
      const runs: TextRun[] = [];
      lines.forEach((line, i) => {
        runs.push(new TextRun({ text: line }));
        if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
      });
      children.push(new Paragraph({ children: runs, spacing: { after: 160 } }));
    }
  }

  const doc = new Document({
    creator: "Mystik Grant Engine",
    title: projectName,
    sections: [{ children }],
  });

  const buffer = Buffer.from(await Packer.toBuffer(doc));
  const safeTitle = projectName.replace(/[^a-z0-9]/gi, "_").slice(0, 60);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
    },
  });
}
