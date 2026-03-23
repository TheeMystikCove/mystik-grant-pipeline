# Grant Engine — Permission Summary

*Subnetwork ID: grant-engine | Generated: 2026-03-22 | Status: Active*

---

## Local Roles

| Role | Recommended Tier | Escalation Authority |
|---|---|---|
| Grant Director | EXECUTIVE_CORE / ADMIN_OPERATIONS | all |
| Grant Coordinator | ADMIN_OPERATIONS | staff_to_admin |
| Reviewer | STAFF_SPECIALIST / ADMIN_OPERATIONS | member_to_staff |
| Document Support | STAFF_SPECIALIST | member_to_staff |
| Applicant | MEMBER | none |
| Member | MEMBER | none |

*Full role definitions: `.nexis/access/local-roles.json`*

---

## Visible Surfaces by Tier

### MEMBER Tier (Applicant role)
| Surface | Label | Actions |
|---|---|---|
| `member_frontend` | Grant Applicant Dashboard | view, use, assist |
| `companion_guidance` | Grant Companion | view, use, assist |
| `application_dashboard` | Application Dashboard | view, use |
| `document_upload_flow` | Document Upload Flow | view, use |
| `status_tracker` | Application Status Tracker | view |

### STAFF_SPECIALIST Tier (adds)
| Surface | Label | Actions |
|---|---|---|
| `local_support_tools` | Grant Support Tools | view, use, create, observe, escalate |
| `local_incidents` | Grant Incident Records | view, observe, escalate |

### ADMIN_OPERATIONS Tier (adds)
| Surface | Label | Actions |
|---|---|---|
| `local_admin_tools` | Grant Admin Tools | view, use, create, edit, configure, assign, approve |
| `template_manager` | Template Manager | view, use, create, edit, configure |
| `backend_ops` | Grant Backend Ops | view, use, configure (limited) |
| `local_incidents` | Grant Incident Records | view, create, edit, assign, export |

### EXECUTIVE_CORE Tier
Full access to all surfaces — all actions per master-access-matrix.json.

---

## Restricted Surfaces

| Surface | Class | Why Restricted |
|---|---|---|
| `local_support_tools` | ADMIN_OPERATIONAL | Internal staff operations — MEMBER denied |
| `local_admin_tools` | ADMIN_OPERATIONAL | Admin interface — MEMBER and STAFF observe only |
| `template_manager` | ADMIN_OPERATIONAL | Template management — MEMBER and STAFF denied |
| `backend_ops` | BACKEND_OPERATIONAL | Backend — MEMBER and STAFF hard denied |
| `local_incidents` | ADMIN_OPERATIONAL | Incident records — MEMBER denied |

---

## Support Scope

| Tier | Can Request | Can Deliver | Escalation |
|---|---|---|---|
| Applicant / Member | Yes (via Companion) | No | Companion → Document Support |
| Document Support / Reviewer | Yes | Yes (applicant-facing) | → Grant Coordinator |
| Grant Coordinator / Director | Yes | Yes (all levels) | → Executive |
| Executive | Yes | Yes (all levels) | — |

---

## Admin / Backend Boundary

- Backend operations (`backend_ops`): Present — admin and executive only
- MEMBER access to backend: **Never** — hard boundary
- STAFF access to backend: **Denied**
- Admin backend access: Limited (view, use, configure only)

---

## Companion Constraints

Companion may reference: `member_frontend`, `companion_guidance`, `application_dashboard`, `document_upload_flow`, `status_tracker`

Companion must NOT reference: `local_support_tools`, `local_admin_tools`, `template_manager`, `backend_ops`, `local_incidents`

---

*[ PERMISSION SUMMARY | GRANT ENGINE | 2026-03-22 ]*
