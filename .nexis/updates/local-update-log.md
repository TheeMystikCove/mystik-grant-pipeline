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
