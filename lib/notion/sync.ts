/**
 * Notion sync layer — Supabase is the source of truth.
 * These functions push data INTO Notion as a read-only operational mirror.
 *
 * Each function upserts by searching for an existing page via the Supabase ID
 * property, then creates or updates accordingly.
 */

import { getNotionClient, NOTION_DBS } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import type { Opportunity, ProposalProject, QAReport, ProposalSection } from "@/types";

// ─── Opportunity sync ─────────────────────────────────────────────────────────

export async function syncOpportunityToNotion(
  opportunityId: string
): Promise<{ notionPageId: string }> {
  const supabase = createAdminClient();
  const notion = getNotionClient();

  const { data: opp } = await supabase
    .from("opportunities")
    .select("*, opportunity_scores(*)")
    .eq("id", opportunityId)
    .single();

  if (!opp) throw new Error(`Opportunity not found: ${opportunityId}`);

  const score = opp.opportunity_scores;
  const existingPageId = await findNotionPage(NOTION_DBS.opportunities, "Supabase ID", opportunityId);

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: opp.name } }] },
    "Supabase ID": { rich_text: [{ text: { content: opportunityId } }] },
    Funder: { rich_text: [{ text: { content: opp.funder_name } }] },
    Status: { select: { name: capitalizeStatus(opp.status) } },
    ...(opp.funder_type && { "Funder Type": { select: { name: opp.funder_type } } }),
    ...(opp.program_area && { "Program Area": { rich_text: [{ text: { content: opp.program_area } }] } }),
    ...(opp.deadline && { Deadline: { date: { start: opp.deadline.split("T")[0] } } }),
    ...(opp.award_max != null && { "Award Max": { number: opp.award_max } }),
    ...(opp.award_min != null && { "Award Min": { number: opp.award_min } }),
    ...(opp.geography && { Geography: { rich_text: [{ text: { content: opp.geography } }] } }),
    ...(opp.source_url && { "Source URL": { url: opp.source_url } }),
    ...(score && { "Priority Score": { number: score.total_score } }),
    ...(score?.label && { "Score Label": { select: { name: score.label } } }),
  };

  if (existingPageId) {
    await notion.pages.update({ page_id: existingPageId, properties: properties as any });
    return { notionPageId: existingPageId };
  }

  const page = await notion.pages.create({
    parent: { database_id: NOTION_DBS.opportunities },
    properties: properties as any,
    ...(opp.notes && {
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: opp.notes } }],
          },
        },
      ],
    }),
  });

  return { notionPageId: page.id };
}

// ─── Proposal status sync ─────────────────────────────────────────────────────

export async function syncProposalStatusToNotion(
  proposalProjectId: string
): Promise<{ notionPageId: string }> {
  const supabase = createAdminClient();
  const notion = getNotionClient();

  const { data: proposal } = await supabase
    .from("proposal_projects")
    .select("*, opportunities(name, funder_name, deadline)")
    .eq("id", proposalProjectId)
    .single();

  if (!proposal) throw new Error(`Proposal not found: ${proposalProjectId}`);

  const opp = proposal.opportunities as any;
  const title = opp?.name
    ? `${opp.name} — ${opp.funder_name ?? ""}`
    : `Proposal ${proposalProjectId.slice(0, 8)}`;

  const existingPageId = await findNotionPage(NOTION_DBS.proposals, "Supabase ID", proposalProjectId);

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    "Supabase ID": { rich_text: [{ text: { content: proposalProjectId } }] },
    Status: { select: { name: capitalizeStatus(proposal.status) } },
    ...(proposal.current_stage && {
      "Current Stage": { rich_text: [{ text: { content: proposal.current_stage.replace(/_/g, " ") } }] },
    }),
    ...(opp?.deadline && { Deadline: { date: { start: opp.deadline.split("T")[0] } } }),
    ...(proposal.requested_amount != null && { "Requested Amount": { number: proposal.requested_amount } }),
  };

  if (existingPageId) {
    await notion.pages.update({ page_id: existingPageId, properties: properties as any });
    return { notionPageId: existingPageId };
  }

  const page = await notion.pages.create({
    parent: { database_id: NOTION_DBS.proposals },
    properties: properties as any,
  });

  return { notionPageId: page.id };
}

// ─── Review checklist sync ────────────────────────────────────────────────────

export async function syncReviewChecklistToNotion(
  proposalProjectId: string
): Promise<{ notionPageId: string }> {
  const supabase = createAdminClient();
  const notion = getNotionClient();

  const [{ data: proposal }, { data: qaReport }, { data: sections }] = await Promise.all([
    supabase
      .from("proposal_projects")
      .select("*, opportunities(name, funder_name)")
      .eq("id", proposalProjectId)
      .single(),
    supabase
      .from("qa_reports")
      .select("*")
      .eq("proposal_project_id", proposalProjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("proposal_sections")
      .select("section_name, word_count")
      .eq("proposal_project_id", proposalProjectId),
  ]);

  if (!proposal) throw new Error(`Proposal not found: ${proposalProjectId}`);

  const opp = proposal.opportunities as any;
  const title = `QA Review — ${opp?.name ?? proposalProjectId.slice(0, 8)}`;
  const qa = qaReport as QAReport | null;
  const totalWords = (sections ?? []).reduce((sum, s: any) => sum + (s.word_count ?? 0), 0);

  const existingPageId = await findNotionPage(NOTION_DBS.review, "Supabase ID", proposalProjectId);

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    "Supabase ID": { rich_text: [{ text: { content: proposalProjectId } }] },
    "Proposal Status": { select: { name: capitalizeStatus(proposal.status) } },
    ...(qa?.approval_recommendation && {
      "QA Recommendation": { select: { name: qa.approval_recommendation } },
    }),
    "Total Words": { number: totalWords },
    "Section Count": { number: sections?.length ?? 0 },
  };

  // Build block content for the page body
  const blocks: unknown[] = [];

  if (qa?.qa_summary) {
    blocks.push(heading("QA Summary"), paragraph(qa.qa_summary));
  }

  if (Array.isArray(qa?.missing_elements_json) && qa.missing_elements_json.length > 0) {
    blocks.push(heading("Missing Elements"));
    for (const item of qa.missing_elements_json as string[]) {
      blocks.push(bulletItem(item));
    }
  }

  if (Array.isArray(sections) && sections.length > 0) {
    blocks.push(heading("Word Count by Section"));
    for (const s of sections as any[]) {
      blocks.push(bulletItem(`${s.section_name.replace(/_/g, " ")}: ${s.word_count ?? 0} words`));
    }
  }

  if (existingPageId) {
    await notion.pages.update({ page_id: existingPageId, properties: properties as any });
    // Replace body blocks
    await replacePageBlocks(notion, existingPageId, blocks);
    return { notionPageId: existingPageId };
  }

  const page = await notion.pages.create({
    parent: { database_id: NOTION_DBS.review },
    properties: properties as any,
    children: blocks as any,
  });

  return { notionPageId: page.id };
}

// ─── Final summary sync ───────────────────────────────────────────────────────

export async function syncFinalSummaryToNotion(
  proposalProjectId: string
): Promise<{ notionPageId: string }> {
  const supabase = createAdminClient();
  const notion = getNotionClient();

  const [{ data: proposal }, { data: sections }] = await Promise.all([
    supabase
      .from("proposal_projects")
      .select("*, opportunities(name, funder_name, deadline, award_max)")
      .eq("id", proposalProjectId)
      .single(),
    supabase
      .from("proposal_sections")
      .select("*")
      .eq("proposal_project_id", proposalProjectId)
      .order("section_name"),
  ]);

  if (!proposal) throw new Error(`Proposal not found: ${proposalProjectId}`);

  const opp = proposal.opportunities as any;
  const title = `Final Proposal — ${opp?.name ?? proposalProjectId.slice(0, 8)}`;

  // Find or create under proposals DB
  const existingPageId = await findNotionPage(
    NOTION_DBS.proposals,
    "Supabase ID",
    proposalProjectId
  );

  const totalWords = (sections ?? []).reduce((sum, s: any) => sum + (s.word_count ?? 0), 0);

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    "Supabase ID": { rich_text: [{ text: { content: proposalProjectId } }] },
    Status: { select: { name: "Finalized" } },
    "Total Words": { number: totalWords },
    ...(opp?.deadline && { Deadline: { date: { start: opp.deadline.split("T")[0] } } }),
    ...(opp?.award_max != null && { "Award Max": { number: opp.award_max } }),
  };

  // Build full proposal as page blocks
  const SECTION_ORDER = [
    "executive_summary", "statement_of_need", "project_description",
    "goals_and_objectives", "program_activities", "evaluation_plan",
    "organizational_capacity", "budget_narrative", "sustainability_plan",
  ];

  const sorted = [...(sections ?? [])].sort((a: any, b: any) => {
    const ai = SECTION_ORDER.indexOf(a.section_name);
    const bi = SECTION_ORDER.indexOf(b.section_name);
    if (ai === -1 && bi === -1) return a.section_name.localeCompare(b.section_name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const blocks: unknown[] = [];
  for (const s of sorted as any[]) {
    if (!s.draft_text) continue;
    blocks.push(heading(s.section_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())));
    // Notion blocks have a 2000-char limit per rich_text — chunk if needed
    const chunks = chunkText(s.draft_text, 1900);
    for (const chunk of chunks) {
      blocks.push(paragraph(chunk));
    }
  }

  if (existingPageId) {
    await notion.pages.update({ page_id: existingPageId, properties: properties as any });
    await replacePageBlocks(notion, existingPageId, blocks);
    return { notionPageId: existingPageId };
  }

  // Create in batches — Notion API limits children to 100 per request
  const page = await notion.pages.create({
    parent: { database_id: NOTION_DBS.proposals },
    properties: properties as any,
    children: blocks.slice(0, 100) as any,
  });

  // Append remaining blocks if any
  if (blocks.length > 100) {
    for (let i = 100; i < blocks.length; i += 100) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: blocks.slice(i, i + 100) as any,
      });
    }
  }

  return { notionPageId: page.id };
}

// ─── Sync job tracker ─────────────────────────────────────────────────────────

export async function recordSyncJob(params: {
  organizationId: string;
  proposalProjectId?: string;
  syncType: "opportunity" | "proposal_status" | "review_checklist" | "final_summary";
  notionTargetId: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("notion_sync_jobs").insert({
    organization_id: params.organizationId,
    proposal_project_id: params.proposalProjectId ?? null,
    sync_type: params.syncType,
    notion_target_id: params.notionTargetId,
    payload_json: params.payload ?? {},
    status: "synced",
    last_synced_at: new Date().toISOString(),
  });
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

async function findNotionPage(
  databaseId: string,
  _propertyName: string,
  value: string
): Promise<string | null> {
  const notion = getNotionClient();
  try {
    // SDK v5: databases.query was removed — use search scoped to the parent database
    const res = await notion.search({
      query: value,
      filter: { property: "object", value: "page" },
      page_size: 5,
    });
    const match = res.results.find(
      (p: any) =>
        p.parent?.type === "database_id" &&
        p.parent.database_id?.replace(/-/g, "") === databaseId.replace(/-/g, "") &&
        p.properties?.["Supabase ID"]?.rich_text?.[0]?.plain_text === value
    );
    return (match as any)?.id ?? null;
  } catch {
    return null;
  }
}

async function replacePageBlocks(
  notion: ReturnType<typeof getNotionClient>,
  pageId: string,
  newBlocks: unknown[]
) {
  // Delete existing children
  const existing = await notion.blocks.children.list({ block_id: pageId });
  for (const block of existing.results) {
    await notion.blocks.delete({ block_id: block.id });
  }
  // Append new blocks in batches of 100
  for (let i = 0; i < newBlocks.length; i += 100) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: newBlocks.slice(i, i + 100) as any,
    });
  }
}

function heading(text: string) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function paragraph(text: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function bulletItem(text: string) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function capitalizeStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}
