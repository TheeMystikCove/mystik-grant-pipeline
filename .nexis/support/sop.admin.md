---
title: Grant Engine — Admin SOP
type: sop
sop_category: sop.admin
subnetwork: grant-engine
access_tier: 2
version: "1.0"
last_updated: "2026-03-22"
surface_scope: "local_admin_tools, template_manager, backend_ops (limited), local_incidents"
companion_safe: false
---

# Grant Engine — Admin Support Guide

*Access tier: ADMIN_OPERATIONS (Tier 2) and above. Not for staff or member distribution.*

---

## I. Admin Authority in the Grant Engine

ADMIN_OPERATIONS personnel have authority to:

- Create, edit, and archive grant opportunity records
- Assign and revoke member access to the Grant Engine subnetwork
- Override pipeline status when warranted (with documentation)
- Trigger data sync operations for member-visible records
- Configure scoring criteria and visibility rules
- Review escalation packets from staff and nx.REMEDY

---

## II. Common Admin Procedures

### Granting Member Access to the Grant Engine

1. Navigate to the member's profile (by MYSK-ID or display name)
2. Confirm the member's lifecycle state is `active`
3. Add `grant-engine` to their `authorized_subnetworks` list
4. Set `escalation_path` appropriately for their role tier
5. Document the change in the member's profile lifecycle log
6. Notify the member and the referring staff member

### Revoking Grant Engine Access

1. Remove `grant-engine` from `authorized_subnetworks`
2. Document the reason in the lifecycle log
3. If related to a security or governance concern, log a `policy-change` event via nx.CHRONICLE

### Correcting a Pipeline Status Error

1. Confirm the correct status through direct inspection of the application record
2. Update the status field with a documented reason note
3. Check the member-facing view to confirm it refreshes within 5 minutes
4. If the view does not refresh, escalate to `nx.remedy` as a `data_sync_issue`

### Configuring Scoring Criteria

1. Navigate to Grant Settings → Scoring Rules
2. Changes to scoring weights take effect on next evaluation run — confirm the schedule
3. Document the change via nx.CHRONICLE `policy-change` event
4. Notify affected staff via HQ announcement if the change impacts ongoing scoring

---

## III. Incident Response

When a technical issue in the Grant Engine affects member-visible data or access:

1. Triage: determine whether it is a `technical_bug`, `data_sync_issue`, or `permissions_issue`
2. Assign to nx.REMEDY for diagnosis (technical_bug or data_sync_issue)
3. Assign to nx.OPS for access issues
4. Document the issue in nx.CHRONICLE if it affects more than one member or persists beyond one session
5. Notify affected members with a plain-language status update (no internal error details)

---

## IV. Demo Scenario — Member Eligibility Dispute

**Situation:** A member claims they should be eligible for a specific grant but the system shows them as ineligible. The member has escalated to admin.

**Resolution path:**
1. Open the member's grant-engine overlay and review their eligibility flags
2. Open the grant record and review the eligibility criteria
3. If the member meets all criteria but the system flags them as ineligible, this is a `data_sync_issue` — escalate to `nx.remedy`
4. If the member does not meet criteria, document the specific unmet criteria and communicate clearly — eligibility decisions are not override-able without executive approval
5. If executive override is warranted, log a `policy-change` event and notify nx.CHRONICLE

---

## V. Escalation Authority

| Issue Type | Admin Action |
|---|---|
| Technical bug | Escalate to nx.remedy → human-admin if unresolved |
| Data sync error | Escalate to nx.remedy with full record context |
| Permissions conflict | Escalate to nx.ops |
| Policy / eligibility dispute | Escalate to EXECUTIVE_CORE if override needed |
| Incident with broad member impact | Log via nx.CHRONICLE → notify executive-review |

---

*[ SOP.ADMIN | GRANT ENGINE | NEXIS SUPPORT LAYER ]*
