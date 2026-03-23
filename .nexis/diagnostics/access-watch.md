---
title: Grant Engine — Access Watch
subnetwork: grant-engine
type: local-access-watch
last_reviewed: 2026-03-22
status: active
---

# Grant Engine — Access Watch

---

## Surface Gate Coverage

| Route Pattern | Mapped Surface | Min Tier | Current Behavior |
|---|---|---|---|
| `/api/nexis/*` | `companion_guidance` | MEMBER | ✓ Auth only (MEMBER-safe) |
| `/api/agents/run-pipeline` | `backend_ops` | ADMIN_OPERATIONS | ✓ Auth + tier check — BLOCKED (no role system yet) |
| `/api/os/*` | `local_admin_tools` | ADMIN_OPERATIONS | ✓ Middleware blocks (STAFF default < ADMIN required) |
| `/api/debug/*` | `local_admin_tools` | ADMIN_OPERATIONS | ✓ Middleware blocks |
| `/api/projects/*` | `local_support_tools` | STAFF_SPECIALIST | ✓ Auth (STAFF_SPECIALIST default — passes) |
| `/api/proposals/*` | `local_support_tools` | STAFF_SPECIALIST | ✓ Auth (STAFF_SPECIALIST default — passes) |
| `/api/opportunities/*` | `application_dashboard` | MEMBER | ✓ Auth only |
| (default) | `member_frontend` | MEMBER | ✓ Auth only |

## Enforcement Status

| Layer | Status |
|---|---|
| Middleware auth gate | ✓ Active (new 2026-03-22) |
| NEXIS surface gate | ✓ Active (new 2026-03-22) |
| `/api/agents/run-pipeline` route-level | ✓ Active (new 2026-03-22) |

## Active Limitation

All admin/backend routes (`/api/agents/run-pipeline`, `/api/os/*`, `/api/debug/*`) are currently **blocked for all users** because there is no role column to elevate specific users to ADMIN_OPERATIONS or EXECUTIVE_CORE. This is the correct safe default — it prevents unintentional admin access while the role system is being built.

**Resolution:** See PRIORITY-GRT-001 in local-integrity-notes.md.

---

*[ ACCESS WATCH | GRANT-ENGINE | 2026-03-22 ]*
