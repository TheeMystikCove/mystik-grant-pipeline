---
title: Grant Engine — Duplicate Watch
subnetwork: grant-engine
type: local-duplicate-watch
last_reviewed: 2026-03-22
status: active
---

# Grant Engine — Duplicate Watch

---

## No Active Duplicates Detected

No exact or near-duplicate files detected within grant-engine in the first diagnostic pass.

---

## Watch Items

### WATCH-GRT-DUP-001 — Agent Definitions
Grant-engine has an extensive agent pipeline (`lib/agents/pipeline/` — 10 files). These are distinct agents in a sequential pipeline. They are not duplicates but may have overlapping prompt patterns. Worth a content audit in a future pass.

### WATCH-GRT-DUP-002 — Nexis Chat vs AI Route
Two AI chat routes exist:
- `/api/nexis/chat/route.ts` — NEXIS strategic companion (main chat interface)
- `/api/ai/route.ts` — separate AI route

These should be checked to ensure they don't overlap in purpose.

---

*[ DUPLICATE WATCH | GRANT-ENGINE | 2026-03-22 ]*
