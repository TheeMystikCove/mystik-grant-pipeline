# grant-engine — Claude Code Build Protocol

## What This Is
The grant-engine is a NEXIS AI.OS subnetwork (NET: grant-engine) for Thee Mystik
Universal Holdings Corp. and Thee Harbor of Hope Foundation. It handles grant opportunity
discovery, pipeline management, scoring, document drafting, and submission tracking.

**NEXIS Core:** `/Users/owner/Desktop/Thee Mystik Universal Holdings Corp./MystikAI/NEXIS_AI_CORE/`
**This subnetwork:** `/Users/owner/Desktop/Thee Mystik Universal Holdings Corp./MystikAI/grant-engine/`

For the full nx.AGENT roster, governance rules, and NEXIS canonical rules — see
`NEXIS_AI_CORE/CLAUDE.md`. This file covers grant-engine-specific conventions.

---

## nx.AGENT Build Consultation Protocol

### Gate 1 — Pre-Build
- **nx.BUSHAN** — Feasibility + gap analysis before any new pipeline feature or schema change
- **nx.ALPHA** — Architecture review for workflow design and implementation sequencing

### Gate 2 — Pre-Commit
- **nx.QUILL** — Pre-deploy risk scan. Ask: "What grant pipeline data could be affected?
  What access boundaries need to be verified?"
- **nx.GRANT** — Domain review for any changes to grant workflow, scoring logic, or
  application pipeline. Ask: "Does this change respect the no-eligibility-determination
  rule? Is pipeline integrity maintained?"

### Gate 3 — Post-Commit
- **nx.CHRONICLE** — Generate changelog entry, save to `.nexis/updates/local-update-log.md`

---

## Grant-Engine Agent Rules (nx.GRANT)

These apply to all grant-engine features — enforce them in code and prompts:

- **No eligibility determinations** — The system guides; humans decide eligibility
- **No modification of pipeline data** by member-facing routes — read-only for members
- **Grant team authority respected** — No workarounds that bypass document access controls
- **No disclosure of internal scoring weights** to member tier
- Pipeline status is informational only — never implies outcome

---

## Subnetwork Context

**Active in this subnetwork:**
- nx.GRANT (Grant Workflow Specialist) — primary domain agent
- nx.LARRY (Business Strategist) — opportunity strategy, positioning
- nx.RALPH (Market Analyst) — grant landscape, funder trends
- nx.ALPHA (Operations) — pipeline architecture, workflow design
- nx.BUSHAN (Systems Analyst) — feasibility, diagnostic review
- nx.QUILL (Incident Intelligence) — pipeline failures, anomaly detection
- nx.CHRONICLE (Update Historian) — changelog, release records

**NEXIS presents in this subnetwork as:** Research assistant and pipeline navigator.
Do not use HQ or Academy language in member-facing grant-engine responses.

---

## .nexis/ Config
This subnetwork's NEXIS configuration lives in `.nexis/` at the repo root.
- `nexis.config.json` — subnetwork identity, NET code, active agents
- `bridge-policy.json` — founder sovereign bridge settings
- `updates/local-update-log.md` — Chronicle writes here post-commit

---

## Core Conventions

### Grant Pipeline Data
- Opportunity records: read from Supabase, never mutated by member-facing routes
- Scoring data: steward/sovereign read-only; never exposed to member tier
- Document access: controlled by grants team — no programmatic bypasses

### Environment Variables
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Claude API for NEXIS |
| `PERPLEXITY_API_KEY` | Grant research queries |

---

## Do Not
- Never expose scoring weights or eligibility criteria to member-tier routes
- Never allow member-facing routes to write to pipeline data
- Never reference HQ or Academy subnetwork context in grant-engine responses
- Always consult nx.GRANT domain rules before modifying any pipeline-adjacent feature
