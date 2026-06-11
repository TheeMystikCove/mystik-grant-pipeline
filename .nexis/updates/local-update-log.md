---
title: Grant Engine — Local Update Log
type: update-log
subnetwork: grant-engine
status: Active
version: V1
last_updated: 2026-03-22
---

# 🧿 Grant Engine — Local Update Log
*(Internal Technical Change Record — Syncs to NEXIS Core via nx.CHRONICLE)*

This document is the internal technical change record for the `grant-engine` subnetwork (GRT). Significant changes are escalated to NEXIS Core through nx.CHRONICLE.

---

## I. Version History

| Version | Date | Type | Summary |
|---------|------|------|---------|
| 1.3.0 | 2026-06-10 | schema-change (low) | **Phase 0 Step 2 — migration renumber.** Two interleaved authoring lineages (grant core + NEXIS gateway tables) renumbered to linear single-DB sequence 001→007 (`provider_registry` before `model_registry`); unnumbered `nexis_ai_executions` → `006_`. All `if not exists`, manual SQL-editor apply, no CLI history — idempotent, no SQL/RLS/access-boundary change. Commit `3016f7a`. |
| 1.2.0 | 2026-06-10 | integration-change (moderate) | **Phase 0 Step 1 — auth untangle.** Half-finished refactor (broken+uncommitted on main) resolved: NEXIS surface-gate merged INTO `proxy.ts` (Next 16 canonical), competing `middleware.ts` deleted, `surface-gate.ts` + `identity/master-access-matrix.json` + migration 004 landed, 7 dead routes removed. Surface-gate defaults no-role users → ADMIN_OPERATIONS (non-breaking single-org; tighten to MEMBER at Phase 1 role column). Build green. Gate 2 reviewed (nx.OPS/nx.QUILL). Commit `1bab8e3`, merged main `6b54daa`. |
| 1.1.0 | 2026-03-22 | minor | nx.CHRONICLE update watch installed. `.nexis/updates/` initialized. |
| 1.0.0 | 2026-03-22 | major | NEXIS Identity Layer integration. GRT net_code configured. `data_access_tier: 3` (most restricted). Grant overlay schema configured. Agent routing for score/research/chat/analysis operational. |

---

## II. Local Integration Notes

**Subnetwork:** `grant-engine` | **Net Code:** GRT | **Data Access Tier:** 3 (Most Restricted)**

Grant Engine operates at the most restricted data access tier in the NEXIS ecosystem.

| Data Type | Access Level |
|-----------|-------------|
| `mysk_id` | read |
| `display_name` | read |
| `lifecycle_state` | read |
| `grant_overlay` | full |

**Cannot access:** Pronouns, contact email, intake responses, learning preferences, Academy overlay, HQ overlay, companion context, resonance tags, open threads

NEXIS mode available on Grant Engine: `admin_copilot` only

---

## III. Local Risk Notes

- Any changes to grant scoring logic must be logged here and escalated to Core
- Changes to opportunity intake fields or eligibility logic are considered `schema-change` severity: moderate
- Grant Engine's restricted access tier must not be expanded without a formal Core governance review
- Agent routing changes (which Perplexity or Claude model handles which request type) must be logged as `integration-change`

---

## IV. How to Log a Local Change

1. Add entry to the Version History table above
2. Notify nx.CHRONICLE with: update type, summary, impacted files, risk level
3. If incident: file in `incidents.md` and escalate to nx.QUILL

---

*[ TIER 2 | GRANT ENGINE | ACTIVE ]*
