import { callAgent } from "@/lib/claude/call-agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncFinalSummaryToNotion, recordSyncJob } from "@/lib/notion/sync";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";
import type { AgentOutput } from "@/types";

// Section order and display labels for the .docx
const SECTION_ORDER = [
  { key: "cover_letter",           label: "Cover Letter" },
  { key: "executive_summary",      label: "Executive Summary" },
  { key: "organization_information", label: "Organization Information" },
  { key: "statement_of_need",      label: "Statement of Need" },
  { key: "goals_and_objectives",   label: "Goals and Objectives" },
  { key: "methods_and_work_plan",  label: "Methods and Work Plan" },
  { key: "evaluation_plan",        label: "Evaluation Plan" },
  { key: "budget_narrative",       label: "Budget Narrative" },
  { key: "sustainability_plan",    label: "Sustainability Plan" },
  { key: "pre_submission_checklist", label: "Pre-Submission Checklist" },
];

export async function runFinalGrantWriter(
  input: Record<string, unknown>
): Promise<AgentOutput> {
  // 1. Run the Claude agent to write the proposal
  const output = await callAgent({ agentName: "final_grant_writer", input });

  const sections = (output.structured_output ?? {}) as Record<string, string>;
  const project = input.proposal_project as Record<string, unknown> | undefined;
  const proposalProjectId = project?.id as string | undefined;
  const projectName = (project?.project_name as string) ?? "Grant Proposal";

  if (!proposalProjectId) return output;

  try {
    // 2. Merge agent sections into proposal_sections table so the UI shows them
    const supabase = createAdminClient();
    const upserts = Object.entries(sections)
      .filter(([, v]) => typeof v === "string" && v.length > 0)
      .map(([section_name, draft_text]) => ({
        proposal_project_id: proposalProjectId,
        section_name,
        draft_text,
        source_agent: "final_grant_writer",
        word_count: draft_text.trim().split(/\s+/).length,
      }));

    if (upserts.length > 0) {
      await supabase.from("proposal_sections").upsert(upserts, {
        onConflict: "proposal_project_id,section_name,revision_number",
      });
    }

    // 3. Build and upload the .docx to Supabase Storage
    const docxBuffer = await buildProposalDocx(projectName, sections);
    const fileName = `${proposalProjectId}/final_proposal.docx`;

    // Ensure the bucket exists (no-op if already created)
    await supabase.storage.createBucket("proposal-documents", {
      public: true,
      fileSizeLimit: 52428800, // 50 MB
    }).catch(() => null); // Ignore "already exists" error

    const { error: storageError } = await supabase.storage
      .from("proposal-documents")
      .upload(fileName, docxBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    let downloadUrl: string | null = null;

    if (!storageError) {
      const { data: urlData } = supabase.storage
        .from("proposal-documents")
        .getPublicUrl(fileName);
      downloadUrl = urlData?.publicUrl ?? null;
    } else {
      console.warn("[final_grant_writer] Storage upload failed:", storageError.message);
    }

    // 4. Sync the full proposal to Notion
    const { notionPageId } = await syncFinalSummaryToNotion(proposalProjectId);

    // 5. If we have a download URL, append it to the Notion page
    if (downloadUrl) {
      await appendDocxLinkToNotionPage(notionPageId, downloadUrl, projectName);
    }

    // 6. Record the sync job
    const orgId = project?.organization_id as string | undefined;
    if (orgId) {
      await recordSyncJob({
        organizationId: orgId,
        proposalProjectId,
        syncType: "final_summary",
        notionTargetId: notionPageId,
        payload: { docx_url: downloadUrl ?? "upload_failed" },
      });
    }

    // 7. Attach metadata to the output so the UI can surface the download link
    output.handoff_payload = {
      ...output.handoff_payload,
      docx_download_url: downloadUrl,
      notion_page_id: notionPageId,
    };
  } catch (err) {
    // Post-processing errors must not swallow the primary agent output
    console.error("[final_grant_writer] post-processing error:", err);
  }

  return output;
}

// ─── .docx builder ────────────────────────────────────────────────────────────

async function buildProposalDocx(
  projectName: string,
  sections: Record<string, string>
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title page header
  children.push(
    new Paragraph({
      text: projectName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: `Prepared by Thee Mystik Universal Holdings Corp.`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Sections in standard order
  for (const { key, label } of SECTION_ORDER) {
    const text = sections[key];
    if (!text) continue;

    // Section heading
    children.push(
      new Paragraph({
        text: label,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        pageBreakBefore: true,
      })
    );

    // Body — split on double newlines to preserve paragraph breaks
    const paragraphs = text.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Render lines within a paragraph, preserving single newlines
      const lines = trimmed.split(/\n/);
      const runs: TextRun[] = [];
      lines.forEach((line, i) => {
        runs.push(new TextRun({ text: line }));
        if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
      });

      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 160 },
        })
      );
    }
  }

  const doc = new Document({
    creator: "Mystik Grant Engine",
    title: projectName,
    description: "Grant proposal generated by Mystik Grant Engine",
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Notion helpers ───────────────────────────────────────────────────────────

async function appendDocxLinkToNotionPage(
  pageId: string,
  downloadUrl: string,
  projectName: string
) {
  const { getNotionClient } = await import("@/lib/notion/client");
  const notion = getNotionClient();

  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "divider",
        divider: {},
      } as any,
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Download" } }],
        },
      } as any,
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `📄 Download "${projectName}" as Word Document (.docx)`,
                link: { url: downloadUrl },
              },
            },
          ],
        },
      } as any,
    ],
  });
}
