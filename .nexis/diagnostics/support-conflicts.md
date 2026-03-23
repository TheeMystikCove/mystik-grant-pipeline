---
title: Grant Engine — Support Conflicts
subnetwork: grant-engine
type: local-support-conflict-watch
last_reviewed: 2026-03-22
status: active
---

# Grant Engine — Support Conflicts

---

## Support Scope Declaration

- `support-scope.json` companion_modes: `member_self_service`, `staff_operational`, `admin_full`, `executive_governance`
- Surface reference: `.nexis/access/surface-map.json` (linked 2026-03-22)

## Escalation Paths

| Tier | Escalation Path |
|---|---|
| MEMBER (Applicant) | nx.atlas → nx.grant → grant-staff-support |
| STAFF | nx.grant → nx.ops → grant-admin-queue |
| ADMIN | nx.ops → nx.remedy → executive-review |
| EXECUTIVE | nx.remedy → peer-review |

**Status:** No conflicts detected.

---

## Note on Companion Scope

The grant-engine Nexis companion has access to database tools (add_opportunity, score_opportunity, update_opportunity, search_opportunities, add_proposal_project) and web search. These tools require organization_id from the users table. The companion operates in a staff-facing context — all users who have access to the grant engine are at minimum staff/applicant level. The `sop.member.md` does not expose pipeline configuration, scoring criteria details, or internal workflow names.

---

*[ SUPPORT CONFLICTS | GRANT-ENGINE | 2026-03-22 ]*
