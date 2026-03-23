---
title: NEXIS Context Rules — Grant Engine
subnetwork: grant-engine
version: V1
last_updated: 2026-03-22
---

# 🧿 NEXIS Context Rules — Grant Engine

---

## I. Mode

Grant Engine uses `admin_copilot` exclusively. No mode switching.

---

## II. Agent Routing

The Grant Engine uses a multi-agent architecture (see `lib/nexis/agent-runner.ts`):

| Task | Agent Route | Model |
|------|-------------|-------|
| Opportunity scoring | `score-opportunity` agent | Claude Sonnet |
| Grant research | Perplexity research layer | sonar-pro |
| Pipeline Q&A | Direct NEXIS chat | Claude Sonnet |
| Strategic analysis | Analyst agent | Claude Sonnet |

---

## III. Available Tools

| Tool | Description |
|------|-------------|
| Score opportunity | Evaluate a grant opportunity for fit and likelihood |
| Search funders | Research funders and their priorities |
| Draft narrative | Generate grant narrative section |
| Summarize opportunity | Condense grant details to key points |
| Pipeline overview | Summarize the current grant pipeline state |

---

## IV. Provider Routing

The Grant Engine uses NEXIS's provider router (`lib/nexis/provider-router.ts`):
- **Claude** → narrative generation, strategic reasoning, chat
- **Perplexity** → live funder research, current program eligibility
- **OpenAI** → fallback for structured output when needed

---

*[ NEXIS | GRANT ENGINE | CONTEXT RULES ]*
