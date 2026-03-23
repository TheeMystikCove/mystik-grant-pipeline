# grant-engine — Founder Sovereign Bridge Channel

*Version: 1.0 | Created: 2026-03-22 | Subnetwork: grant-engine*
*Access: FOUNDER_SOVEREIGN only — MYSK-J7M-4N2-X9Q*

---

## Bridge Mode in grant-engine

This subnetwork supports the NEXIS Mainframe Bridge for founder sovereign sessions. When the founder sovereign (`MYSK-J7M-4N2-X9Q`) initiates a session in grant-engine with bridge mode active (`sovereign_context_active: true`), the following applies:

**Local Context Preserved**
grant-engine's local subnetwork context — grant workflows, applicant data, local roles, surfaces, and tools — remains fully active during bridge mode. Bridge mode layers Mainframe authority on top; it does not replace or suspend the local context.

**Founder Bridge Does Not Expose This Mode to Lower Tiers**
Bridge mode is invisible to applicants, document support staff, and grant coordinators in grant-engine. Their sessions and interfaces are unaffected by whether the founder has bridge mode active. No member-visible output indicates bridge mode is available or active.

**Sovereign Channel**
In bridge mode, the sovereign channel is available within this subnetwork. Actions taken through the sovereign channel are tagged with `[SOVEREIGN]` in the grant-engine audit trail.

**Logging**
All bridge actions within grant-engine are logged to the subnetwork's local incident/update log and to the NEXIS core update registry. There are no logging exemptions in bridge mode.

---

*[ FOUNDER_SOVEREIGN | grant-engine | NEXIS AI.OS | 2026-03-22 ]*
