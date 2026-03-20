"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/claude/client";

// ─── Document text extraction ─────────────────────────────────────────────────

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // txt, md, plain text
  return buffer.toString("utf-8");
}

// ─── Claude project parser ────────────────────────────────────────────────────

interface ParsedProject {
  title: string;
  description: string;
  program_area: string;
  target_population: string;
  estimated_budget: number | null;
  timeline: string;
  tags: string[];
}

async function parseDocumentWithClaude(text: string): Promise<ParsedProject> {
  const client = getAnthropicClient();
  const truncated = text.slice(0, 12000); // stay well within token limits

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract structured information from this nonprofit project document. Return ONLY valid JSON, no other text.

Document:
${truncated}

Return this exact JSON structure:
{
  "title": "concise project title (max 80 chars)",
  "description": "2-3 sentence summary of what this project does and why",
  "program_area": "primary program/service area (e.g. Mental Health, Youth Development, Housing)",
  "target_population": "who this project serves",
  "estimated_budget": null or a number (total project budget if mentioned),
  "timeline": "project timeline or duration if mentioned, otherwise empty string",
  "tags": ["5 to 10 keyword tags for grant matching, specific and relevant"]
}`,
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackParsed(text);

  try {
    return JSON.parse(jsonMatch[0]) as ParsedProject;
  } catch {
    return fallbackParsed(text);
  }
}

function fallbackParsed(text: string): ParsedProject {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "Untitled Project";
  return {
    title: firstLine.slice(0, 80),
    description: text.slice(0, 300),
    program_area: "",
    target_population: "",
    estimated_budget: null,
    timeline: "",
    tags: [],
  };
}

// ─── Server actions ───────────────────────────────────────────────────────────

export async function createProjectFromDocument(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();

  const orgId = userData?.organization_id;
  if (!orgId) return { error: "No organization linked to this account" };

  const file = formData.get("document") as File | null;
  const manualTitle = (formData.get("title") as string | null)?.trim();

  let documentText = "";
  let documentUrl: string | null = null;
  let parsed: ParsedProject;

  if (file && file.size > 0) {
    // Upload to Supabase Storage
    const admin = createAdminClient();
    const fileName = `${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: uploadData } = await admin.storage
      .from("project-documents")
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadData) {
      const { data: urlData } = admin.storage
        .from("project-documents")
        .getPublicUrl(uploadData.path);
      documentUrl = urlData.publicUrl;
    }

    // Extract + parse text
    try {
      documentText = await extractText(file);
      parsed = await parseDocumentWithClaude(documentText);
    } catch (err) {
      console.error("[projects/new] extraction error:", err);
      parsed = { title: manualTitle ?? "Untitled Project", description: "", program_area: "", target_population: "", estimated_budget: null, timeline: "", tags: [] };
    }
  } else {
    // Manual creation — use form fields directly
    const tagsRaw = (formData.get("tags") as string | null) ?? "";
    parsed = {
      title: manualTitle ?? "Untitled Project",
      description: (formData.get("description") as string | null) ?? "",
      program_area: (formData.get("program_area") as string | null) ?? "",
      target_population: (formData.get("target_population") as string | null) ?? "",
      estimated_budget: null,
      timeline: "",
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    };
  }

  const { data: project, error } = await createAdminClient()
    .from("projects")
    .insert({
      organization_id: orgId,
      title: parsed.title,
      description: parsed.description || null,
      program_area: parsed.program_area || null,
      target_population: parsed.target_population || null,
      estimated_budget: parsed.estimated_budget,
      timeline: parsed.timeline || null,
      tags: parsed.tags,
      source_document_url: documentUrl,
      source_document_text: documentText || null,
      status: "draft",
      architect_stage: "intro",
      conversation_history: [],
    })
    .select("id")
    .single();

  if (error || !project) return { error: error?.message ?? "Failed to create project" };

  // Fire-and-forget: initial grant matching
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/projects/${project.id}/match-grants`, {
    method: "POST",
  }).catch(() => {});

  redirect(`/projects/${project.id}`);
}

export async function updateProjectTags(
  projectId: string,
  tags: string[]
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  return error ? { error: error.message } : {};
}

export async function archiveProject(projectId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", projectId);
  return error ? { error: error.message } : {};
}
