---
title: NEXIS Member Intelligence Slice — Grant Engine
subnetwork: grant-engine
version: V1
last_updated: 2026-03-22
---

# 🧿 Member Intelligence Slice — Grant Engine

---

## I. What NEXIS Reads

### From Supabase (Live Data)
- `profiles` table: full_name, role
- `opportunities` table: active grant opportunities, deadlines, scores
- `nexis_execution_logs` table: recent agent runs, scoring results
- `provider_registry` / `model_registry` tables: which models are available

### From NEXIS Identity Layer
- MYSK-ID only (for identity reference)
- Grant overlay (active opportunities, pipeline stage)

---

## II. What NEXIS Does NOT Read

Everything outside the grant researcher context:
- Academy learning data
- HQ staff context
- Companion relationship data
- Intake responses or learning preferences

---

## III. Intelligence by Feature

### Opportunity Scoring (agent routing)
NEXIS routes grant opportunity data through the agent system:
- `score-opportunity` agent: evaluates fit, likelihood, effort
- Returns structured score + rationale

### Pipeline Chat (admin_copilot)
Researcher asks questions about opportunities, deadlines, strategy.
NEXIS draws from active opportunity data injected into context.

### Research Assistance (admin_copilot)
NEXIS uses Perplexity (`sonar-pro`) to research grant programs, funder priorities, and eligibility requirements.

---

*[ NEXIS | GRANT ENGINE | INTELLIGENCE SLICE ]*
