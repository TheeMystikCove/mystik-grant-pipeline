# Grant Engine — Productize for Market · RESUME

> Resume point for Backlog **#097**. Read this first to pick up cold.
> Last updated: **2026-06-10**

---

## Mission

Founder ("Uncle") directed shifting Grant Engine into focus for **marketing/advertising**.
Verdict from comprehensive analysis: **OPTIMIZE + PRODUCTIZE — do NOT rebuild from scratch.**
The bones are sound; the gap is packaging, not architecture.

**Locked founder decisions (2026-06-10):**
1. **Audience = External multi-tenant SaaS** (onboard outside nonprofits/foundations)
2. **Monetization = Paid product** → **nx.MINT EIR is MANDATORY before any pricing code**
3. Untangle the in-flight refactor first

---

## What this app already is (the assets — don't rebuild these)

- **18-agent orchestrated pipeline** (`lib/agents/orchestrator.ts`): discovery → eligibility → scoring → intake → requirements parse → funder-fit → evidence → program architect → narrative → budget → evaluation → compliance QA → compile → revision → final write.
- **15-table RLS schema** with role tiers (`founder_admin`…`ops_assistant`), org-scoping, scoring, readiness, proposal versioning, Notion sync.
- **Multi-provider AI gateway** (`lib/nexis/`): Claude/OpenAI/Gemini/Perplexity adapters + provider router + model registry + cost estimator + task classifier.
- **Discovery sources:** grants.gov + live web-search scout + funder enrichment.
- **DOCX export** of finished proposals.
- Next.js 16 (Turbopack) · React 19 · Supabase · Tailwind v4.

**Databases (important):**
- Main app DB: `akimeanoqhbtcwfmjopw` (`NEXT_PUBLIC_SUPABASE_URL`) — grant schema **AND** the `nexis_*` tables (they write via `createAdminClient`).
- Secondary NEXIS DB: `failrrgqatockyrafrcc` (`NEXIS_SUPABASE_URL`) — used **only** by `lib/nexis/knowledge/canon-context.ts` (canon) + `/api/os/canon`.
- Migrations are applied by **manual SQL-editor paste** — no `config.toml`, no CLI migration tracking. All files are `if not exists` (idempotent).
- Repo remote: `github.com/TheeMystikCove/mystik-grant-pipeline` (origin/main).

---

## ✅ DONE — Phase 0 (cleanup), fully pushed to origin/main

**Step 1 — Auth untangle** (commit `1bab8e3`, merged `6b54daa`)
- Root cause: a half-finished refactor sat broken + uncommitted on `main`. Next.js 16 requires `proxy.ts`, but the refactor added a competing `middleware.ts` carrying the NEXIS surface-gate → `next build` rejected both files.
- Fix: merged the surface-gate **into `proxy.ts`** (kept its resilient auth + iframe `SameSite=None` cookies), deleted `middleware.ts`, landed `lib/nexis/surface-gate.ts` + `identity/permissions/registry/master-access-matrix.json` + migration `004`, removed 7 dead routes.
- Surface-gate currently defaults no-role users → `ADMIN_OPERATIONS` (non-breaking for single-org staff). **Phase 1 tightens this to `MEMBER` once a real role column exists.** See the NOTE block in `proxy.ts` and `lib/nexis/surface-gate.ts:resolveGrantTier`.
- Build verified green (`next build`, exit 0). Gate 2 reviewed (nx.OPS/nx.QUILL).

**Step 2 — Migration renumber** (commit `3016f7a`)
- Was: two `001_`, two `002_`, one unnumbered. Now linear single-DB sequence (FK-correct — provider_registry before model_registry):
  ```
  001 initial_schema          002 add_verification_status
  003 nexis_execution_logs     004 nexis_provider_registry
  005 nexis_model_registry     006 nexis_ai_executions
  007 projects_and_matches
  ```
- Confirmed single-DB collision (not a two-DB split). Git tracked as renames; `-- Migration:` header tags updated.

**Chronicle (Gate 3):** `.nexis/updates/local-update-log.md` — v1.2.0 (untangle) + v1.3.0 (renumber). Latest commit `e3e6688`.

---

## 🔜 NEXT — Phase 1 (productize). START HERE.

Phase 1 is real feature work → **open Gate 1 (nx.BUSHAN feasibility + nx.ALPHA architecture) before building.**

1. **Landing page / marketing front door** — `app/page.tsx` + `README.md` are still `create-next-app` boilerplate. Highest leverage since the goal is advertising. (Open Gate 1 on this OR the multi-tenant foundation first — founder to pick.)
2. **Multi-tenant foundation** — add a `role` column to `users`, org self-signup/provisioning, per-org isolation testing. This also lets `resolveGrantTier()` map real tiers and tighten the surface-gate default from `ADMIN_OPERATIONS` → `MEMBER`.
3. **Pricing/subscription** — ⚠️ **nx.MINT EIR opens BEFORE any pricing code** (founder locked "paid product"). No nexSTORE/EXP/billing mechanic exists in this repo yet.

## Phase 2 — harden
- Gate 2 pass on `identity/` + `surface-gate.ts`.
- Error/empty/loading states audit across the 18-agent flows.
- Wire the existing `lib/nexis/utils/cost-estimator.ts` to real spend limits.

## Phase 3 — go-to-market
- Demo org + seeded sample pipeline for sales.
- nx.RALPH positioning brief + nx.LARRY pricing/roadmap.

---

## Governance reminders for this repo
- `supabase/migrations/`, `identity/`, `agents/`, registry files → **Gate 2** (nx.OPS + nx.QUILL) + founder confirm before writing.
- Anything touching EXP/pricing/economy → **nx.MINT EIR** before Gate 1 closes.
- New agent/surface/role → registry chain (`agents/AGENTS.md`, core registry JSON, `02_AGENT_REGISTRY/`, update-events index).
- Hard rules still apply: no eligibility determinations, no member-tier writes to pipeline data, never expose scoring weights to member tier.
