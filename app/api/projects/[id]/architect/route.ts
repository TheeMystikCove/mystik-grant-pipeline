import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/claude/client";
import { loadSkillPrompt } from "@/lib/claude/skills";
import type { ArchitectStage } from "@/types";

const STAGE_ORDER: ArchitectStage[] = [
  "intro", "problem", "population", "outcomes", "budget", "timeline", "complete",
];

function nextStage(current: ArchitectStage): ArchitectStage {
  const idx = STAGE_ORDER.indexOf(current);
  return STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { message } = (await req.json()) as { message: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Load current project state
  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("title, description, program_area, target_population, estimated_budget, timeline, tags, conversation_history, architect_stage")
    .eq("id", id)
    .single();

  if (fetchErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const currentStage = (project.architect_stage ?? "intro") as ArchitectStage;
  const history = (project.conversation_history ?? []) as Array<{ role: string; content: string; stage: string }>;

  // Build Claude messages from conversation history
  const messages: { role: "user" | "assistant"; content: string }[] = history.map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  // Add current user message
  messages.push({ role: "user", content: message });

  // Load skill as system prompt
  const skillPrompt = loadSkillPrompt("project_initiative_architect");
  const systemPrompt = `${skillPrompt}

## Current Project Context
Title: ${project.title}
Description: ${project.description ?? ""}
Program Area: ${project.program_area ?? ""}
Target Population: ${project.target_population ?? ""}
Tags: ${(project.tags ?? []).join(", ")}
Estimated Budget: ${project.estimated_budget ? `$${project.estimated_budget.toLocaleString()}` : "not specified"}

## Current Stage: ${currentStage}

Respond in JSON format as specified in your skill instructions.`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    let parsed: {
      reply: string;
      extracted_fields?: Record<string, unknown>;
      stage_complete?: boolean;
      advance_to_stage?: ArchitectStage | null;
      initiative_brief?: Record<string, unknown> | null;
    } = { reply: rawText };

    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* use raw */ }
    }

    const reply = parsed.reply ?? rawText;
    const stageComplete = parsed.stage_complete ?? false;
    const newStage = stageComplete
      ? (parsed.advance_to_stage ?? nextStage(currentStage))
      : currentStage;

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: "user", content: message, stage: currentStage },
      { role: "assistant", content: reply, stage: currentStage },
    ];

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      conversation_history: updatedHistory,
      architect_stage: newStage,
      updated_at: new Date().toISOString(),
    };

    // Merge any extracted fields into the project
    const fields = parsed.extracted_fields ?? {};
    const fieldMap: Record<string, string> = {
      problem_statement: "problem_statement",
      target_population: "target_population",
      theory_of_change: "theory_of_change",
      target_outcomes: "target_outcomes",
      budget_framework: "budget_framework",
      timeline: "timeline",
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] != null && fields[key] !== "") {
        updatePayload[col] = typeof fields[key] === "object"
          ? JSON.stringify(fields[key])
          : String(fields[key]);
      }
    }

    if (newStage === "complete" && parsed.initiative_brief) {
      updatePayload.initiative_brief = parsed.initiative_brief;
    }

    await supabase.from("projects").update(updatePayload).eq("id", id);

    return NextResponse.json({
      reply,
      stage: newStage,
      complete: newStage === "complete",
    });
  } catch (err) {
    const message_err = err instanceof Error ? err.message : String(err);
    console.error("[architect]", message_err);
    return NextResponse.json({ error: message_err }, { status: 500 });
  }
}
