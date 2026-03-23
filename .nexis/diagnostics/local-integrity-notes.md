---
title: Grant Engine — Local Integrity Notes
subnetwork: grant-engine
type: local-integrity-watch
last_reviewed: 2026-03-22
status: active
---

# Grant Engine — Local Integrity Notes

---

## Access Architecture Status

| Component | Status | Notes |
|---|---|---|
| `middleware.ts` | ✓ Active (new 2026-03-22) | Created in Process Two — previously missing |
| `lib/nexis/surface-gate.ts` | ✓ Active (new 2026-03-22) | Defaults all authenticated users to STAFF_SPECIALIST |
| `/api/agents/run-pipeline` auth | ✓ Active (new 2026-03-22) | Auth + tier check added — previously had ZERO auth |
| `/api/nexis/chat` auth | ✓ Active (original) | supabase.auth.getUser() |

## Critical Status

**LEAK-001 RESOLVED.** The `/api/agents/run-pipeline` endpoint previously had zero authentication. Any HTTP request could trigger the full 10-stage grant proposal pipeline. Fixed with auth check + NEXIS tier check. Pipeline is now correctly restricted.

---

## Priority Action Item

### PRIORITY-GRT-001 — Add Role Column to users Table

The grant-engine `lib/nexis/surface-gate.ts` defaults all authenticated users to **STAFF_SPECIALIST** because there is no role column in the `users` table. This means:

- `/api/agents/run-pipeline` and `/api/os/*` routes (mapped to `backend_ops` and `local_admin_tools`) are **blocked for all users** including grant directors
- Grant coordinators and directors cannot access admin-level pipeline operations until this is resolved

**Required steps:**
1. Add a `role` column to the `users` table (suggested values: `grant_director`, `grant_coordinator`, `reviewer`, `document_support`, `applicant`, `member`)
2. Update `resolveGrantTier()` in `lib/nexis/surface-gate.ts` — the role-to-tier mappings are already written as commented-out code, ready to uncomment
3. Assign roles to existing users via Supabase admin

**This is the highest priority local action item for grant-engine.**

---

## Local Role Model

See `.nexis/access/local-roles.json` for the 6 declared grant-engine local roles.
See `lib/nexis/surface-gate.ts` for the tier mapping extension point.

---

*[ LOCAL INTEGRITY | GRANT-ENGINE | 2026-03-22 ]*
