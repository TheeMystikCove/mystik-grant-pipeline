"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import type { AgentName } from "@/types";

export async function triggerAgent(formData: FormData) {
  const proposalProjectId = formData.get("proposal_project_id") as string;
  const agentName = formData.get("agent_name") as AgentName;

  // Forward session cookies so the auth guard on /api/agents/run passes
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ proposalProjectId, agentName, input: {} }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Agent trigger failed: ${body}`);
  }

  revalidatePath(`/proposals/${proposalProjectId}`);
}

export async function approveGate(formData: FormData) {
  const supabase = await createServerClient();
  const proposalProjectId = formData.get("proposal_project_id") as string;

  await supabase
    .from("proposal_projects")
    .update({ status: "in_pipeline" })
    .eq("id", proposalProjectId);

  revalidatePath(`/proposals/${proposalProjectId}`);
}

export async function saveSectionEdit(formData: FormData) {
  const supabase = await createServerClient();
  const proposalProjectId = formData.get("proposal_project_id") as string;
  const sectionId = formData.get("section_id") as string;
  const draftText = formData.get("draft_text") as string;

  await supabase
    .from("proposal_sections")
    .update({
      draft_text: draftText,
      word_count: draftText.trim().split(/\s+/).length,
    })
    .eq("id", sectionId);

  revalidatePath(`/proposals/${proposalProjectId}`);
}
