/**
 * Core Claude API caller for all grant engine agents.
 *
 * Every adapter calls this function. It:
 * 1. Loads the skill's .md file as the system prompt
 * 2. Serializes the enriched input as the user turn
 * 3. Calls claude-sonnet-4-6 with extended thinking disabled (fast pipeline)
 * 4. Parses the response — expects a JSON block conforming to AgentOutput
 * 5. Falls back gracefully if the model returns prose instead of JSON
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "./client";
import { loadSkillPrompt } from "./skills";
import type { AgentOutput, ConfidenceLevel } from "@/types";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

const OUTPUT_SCHEMA_INSTRUCTION = `
## Required Output Format

You MUST end your response with a JSON block that conforms exactly to this schema.
Wrap it in triple-backtick json fences:

\`\`\`json
{
  "summary": "<1-3 sentence summary of what you produced>",
  "assumptions": ["<assumption>"],
  "missing_information": ["<missing field or data>"],
  "recommendations": ["<recommendation for downstream agents or the user>"],
  "structured_output": {
    // Agent-specific output goes here.
    // For section-producing agents (narrative, budget, evaluation, compiler, final):
    //   keys are section names, values are the full draft text strings.
    // For analysis agents: keys are whatever structured data this agent produces.
  },
  "handoff_payload": {
    // Normalized data passed to the next agent in the pipeline.
  },
  "confidence_level": "high" | "medium" | "low"
}
\`\`\`

Do not omit any field. Use empty arrays [] for list fields with no items.
Use an empty object {} for structured_output or handoff_payload if not applicable.
`.trim();

export async function callAgent(params: {
  agentName: string;
  input: Record<string, unknown>;
}): Promise<AgentOutput> {
  const { agentName, input } = params;

  const skillPrompt = loadSkillPrompt(agentName);
  const systemPrompt = `${skillPrompt}\n\n---\n\n${OUTPUT_SCHEMA_INSTRUCTION}`;

  const userMessage = buildUserMessage(input);

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    stream: false,
  });

  const rawText = extractText(response as Anthropic.Message);
  return parseAgentOutput(rawText, agentName);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUserMessage(input: Record<string, unknown>): string {
  const parts: string[] = [];

  // Surface the most relevant fields first for readability
  if (input.proposal_project) {
    parts.push(`## Proposal Project\n${JSON.stringify(input.proposal_project, null, 2)}`);
  }
  if (input.intake) {
    parts.push(`## Project Intake\n${JSON.stringify(input.intake, null, 2)}`);
  }
  if (input.prior_outputs && Object.keys(input.prior_outputs as object).length > 0) {
    parts.push(`## Prior Agent Outputs\n${JSON.stringify(input.prior_outputs, null, 2)}`);
  }

  // Remaining input fields
  const remaining = Object.fromEntries(
    Object.entries(input).filter(
      ([k]) => !["proposal_project", "intake", "prior_outputs"].includes(k)
    )
  );
  if (Object.keys(remaining).length > 0) {
    parts.push(`## Additional Context\n${JSON.stringify(remaining, null, 2)}`);
  }

  if (parts.length === 0) {
    parts.push("No context provided. Apply your skill using general best practices.");
  }

  return parts.join("\n\n");
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseAgentOutput(raw: string, agentName: string): AgentOutput {
  // Try to extract a ```json ... ``` block first
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return normalizeOutput(parsed);
    } catch {
      // Fall through to prose fallback
    }
  }

  // Try bare JSON object anywhere in the text
  const bareMatch = raw.match(/\{[\s\S]*"summary"[\s\S]*\}/);
  if (bareMatch) {
    try {
      const parsed = JSON.parse(bareMatch[0]);
      return normalizeOutput(parsed);
    } catch {
      // Fall through to prose fallback
    }
  }

  // Prose fallback — wrap the full text as the summary
  console.warn(`[${agentName}] Could not parse JSON from response — using prose fallback`);
  return {
    summary: raw.slice(0, 500),
    assumptions: ["Output was prose, not structured JSON — review manually"],
    missing_information: [],
    recommendations: [],
    structured_output: { full_response: raw },
    handoff_payload: {},
    confidence_level: "low",
  };
}

function normalizeOutput(raw: Record<string, unknown>): AgentOutput {
  return {
    summary: String(raw.summary ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    missing_information: Array.isArray(raw.missing_information)
      ? raw.missing_information.map(String)
      : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(String)
      : [],
    structured_output: (raw.structured_output as Record<string, unknown>) ?? {},
    handoff_payload: (raw.handoff_payload as Record<string, unknown>) ?? {},
    confidence_level: (["high", "medium", "low"].includes(raw.confidence_level as string)
      ? raw.confidence_level
      : "medium") as ConfidenceLevel,
  };
}
