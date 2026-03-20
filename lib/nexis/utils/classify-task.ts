// Task type classifier — infers task type from prompt content when not explicitly provided

import type { NexisTaskType } from "../schemas/ai-request"

interface ClassificationRule {
  taskType: NexisTaskType
  keywords: string[]
  weight: number
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    taskType: "architecture",
    keywords: [
      "architecture", "system design", "schema", "structure",
      "blueprint", "codex", "framework design", "spec", "specification",
      "design pattern", "infrastructure", "build", "implement",
    ],
    weight: 1.0,
  },
  {
    taskType: "research",
    keywords: [
      "research", "find", "discover", "search", "look up",
      "what is", "who is", "when did", "current", "latest",
      "news", "recent", "today", "2024", "2025", "2026",
    ],
    weight: 1.0,
  },
  {
    taskType: "code",
    keywords: [
      "code", "function", "debug", "fix bug", "typescript",
      "javascript", "python", "sql", "query", "script", "compile",
      "runtime", "error", "exception", "refactor", "test",
    ],
    weight: 1.2, // higher weight — code requests are unambiguous
  },
  {
    taskType: "grounding",
    keywords: [
      "url", "http", "website", "webpage", "analyze this link",
      "google", "search and verify", "ground", "fact check",
      "source", "citation needed", "verify",
    ],
    weight: 1.0,
  },
  {
    taskType: "workflow",
    keywords: [
      "workflow", "pipeline", "automate", "process", "steps",
      "sequence", "run", "execute", "trigger", "schedule",
      "task", "action item", "checklist",
    ],
    weight: 0.9,
  },
  {
    taskType: "proposal",
    keywords: [
      "proposal", "grant", "funding", "application", "pitch",
      "budget", "narrative", "program design", "initiative",
      "funder", "foundation", "award",
    ],
    weight: 1.1,
  },
  {
    taskType: "meeting_recap",
    keywords: [
      "meeting", "recap", "summary", "notes", "minutes",
      "discussed", "action items", "follow up", "agenda",
      "call", "zoom", "transcript",
    ],
    weight: 1.1,
  },
  {
    taskType: "content",
    keywords: [
      "blog", "post", "social media", "instagram", "twitter",
      "newsletter", "email", "copy", "write", "draft",
      "headline", "caption", "content calendar", "seo",
    ],
    weight: 1.0,
  },
  {
    taskType: "knowledge_lookup",
    keywords: [
      "explain", "what does", "define", "tell me about",
      "how does", "why is", "describe", "summarize",
      "overview", "background", "context",
    ],
    weight: 0.8,
  },
]

/**
 * Infers task type from prompt text using keyword scoring.
 * Returns the highest-scoring task type or "general" if no match.
 */
export function classifyTask(prompt: string): NexisTaskType {
  const lowerPrompt = prompt.toLowerCase()

  const scores = new Map<NexisTaskType, number>()

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0
    for (const keyword of rule.keywords) {
      if (lowerPrompt.includes(keyword)) {
        score += rule.weight
      }
    }
    if (score > 0) {
      scores.set(rule.taskType, (scores.get(rule.taskType) ?? 0) + score)
    }
  }

  if (scores.size === 0) return "general"

  let bestType: NexisTaskType = "general"
  let bestScore = 0

  for (const [taskType, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score
      bestType = taskType
    }
  }

  return bestType
}
