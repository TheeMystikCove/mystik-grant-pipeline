---
title: Grant Engine — Staff SOP
type: sop
sop_category: sop.staff
subnetwork: grant-engine
access_tier: 3
version: "1.0"
last_updated: "2026-03-22"
surface_scope: "local_support_tools, local_incidents"
companion_safe: false
---

# Grant Engine — Staff Support Guide

*Access tier: STAFF_SPECIALIST (Tier 3) and above. Do not share with MEMBER-tier users.*

---

## I. Staff Role in the Grant Engine

Grant Engine staff members are responsible for:

- Curating and updating grant opportunity records
- Scoring and tagging opportunities against organizational criteria
- Managing application documents and tracking pipeline status
- Supporting members who have been referred to the Grant Engine
- Coordinating with ADMIN_OPERATIONS on eligibility determinations

---

## II. Common Staff Troubleshooting

### "A grant record isn't showing the right status."

1. Open the grant record and review the status history log
2. Confirm the last action was saved — unsaved edits do not update status
3. If status was changed externally (e.g., by admin), the log will show the change actor
4. If the log shows no change but the status is incorrect, document and escalate to `hq-admin-queue`

### "A member reports they cannot see a grant they should have access to."

1. Confirm the member's MYSK-ID and account activation state
2. Review the visibility settings on the grant record — confirm the record is in a member-visible stage
3. Check the member's authorized subnetwork list — Grant Engine must be listed
4. If all checks pass and the member still cannot see it, escalate to `nx.ops` with the member's MYSK-ID and grant record ID

### "A document template is missing or broken."

1. Confirm the template name and expected location
2. Check if the template was recently updated — there may be a staging/publish delay
3. If the template file itself appears corrupted or inaccessible at the backend, escalate to `nx.remedy`

### "The scoring tool is not saving inputs."

1. Clear browser cache and retry
2. Confirm you are within the allowed editing window for the grant record
3. If the issue persists across sessions, document the grant record ID and escalate to `nx.remedy` as a `technical_bug`

---

## III. Escalation Preparation

Before escalating, collect:

- Grant record ID
- Member MYSK-ID (if member-facing issue)
- Description of the expected state vs. actual state
- Timestamps of when the issue was first noticed
- Any error messages (screenshot or text)
- Steps already taken

---

## IV. Demo Scenario — Member Pipeline Stage Mismatch

**Situation:** A member reports their grant shows status "Under Review" but the grants team has already moved it to "Pending Decision."

**Resolution path:**
1. Open the grant record and confirm the current backend status
2. Check the status history — confirm when the transition occurred
3. If the member-facing status has not refreshed, this is a `data_sync_issue`
4. Escalate to `nx.remedy` with the grant record ID and a description of the mismatch
5. Provide the member with the correct current status verbally while sync is resolved

---

*[ SOP.STAFF | GRANT ENGINE | NEXIS SUPPORT LAYER ]*
