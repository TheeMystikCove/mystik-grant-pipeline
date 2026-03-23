---
title: Grant Engine — Local Incident Log
type: incident-log
subnetwork: grant-engine
status: Active
version: V1
last_updated: 2026-03-22
---

# 🔴 Grant Engine — Local Incident Log
*(Internal Incident Tracking — Escalate Significant Incidents to nx.QUILL + nx.CHRONICLE)*

---

## Current Status

**Active Incidents:** 0
**Last Reviewed:** 2026-03-22

No active incidents as of this date.

---

## How to Log an Incident

Incidents on Grant Engine may include:
- Opportunity scoring returning incorrect or inconsistent results
- Perplexity research returning stale or inaccurate grant data
- Grant overlay eligibility flags not reflecting current member state
- NEXIS accessing data outside the Grant Engine access tier (escalate immediately — data boundary violation)
- Agent routing failure (wrong model handling a request type)

**Incident format:**
```
### INC-GRT-[YYYY-MM-DD]-[SEQ]
**Title:** [Short description]
**Severity:** low | moderate | high | critical
**Status:** investigating | monitoring | mitigated | resolved
**Detected:** [timestamp]
**Summary:** [What was observed]
**Mitigation:** [What was done]
**Resolved:** [timestamp or "open"]
```

Reference the incident model: `NEXIS_AI_CORE/updates/incident-model.md`

**Note:** Any data boundary violation (NEXIS receiving data it should not have access to at the GRT tier) is automatically severity: critical and must be escalated immediately to nx.QUILL + Core governance.

---

## Incident History

*No incidents recorded.*

---

*[ TIER 2 | GRANT ENGINE | ACTIVE ]*
