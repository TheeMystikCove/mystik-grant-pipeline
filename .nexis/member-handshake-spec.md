---
title: NEXIS Member Handshake Specification — Grant Engine
subnetwork: grant-engine
net_code: GRT
version: V1
last_updated: 2026-03-22
reference: NEXIS_AI_CORE/identity/README.md
---

# 🧿 NEXIS Member Handshake — Grant Engine
*(How NEXIS initializes a researcher session in the Grant Engine)*

---

## I. Overview

In the Grant Engine, NEXIS operates as a pure operational intelligence — grant research assistant, opportunity scorer, pipeline manager. There is no companion relationship layer here. The handshake is minimal: resolve identity, load grant overlay, inject operational context.

---

## II. Handshake Sequence

### Step 1 — Auth Resolution
Resolve `user.id` → look up MYSK-ID → if not found, generate GRT-series MYSK-ID.

### Step 2 — Researcher Context
Load from grant-engine Supabase tables:
- Researcher name and role
- Active opportunities they're tracking
- Recent scoring history
- Pipeline stage overview

### Step 3 — Mode
Always `admin_copilot`. No mode switching.

### Step 4 — System Prompt
NEXIS receives researcher name, active opportunities, scoring context.
No companion context. No intake data. No Academy or HQ context.

---

## III. Data the Grant Engine Receives

- ✓ MYSK-ID, display name, lifecycle state
- ✓ Grant overlay (active opportunities, scoring history)
- ✗ Everything else

---

*[ NEXIS | GRANT ENGINE | SUBNETWORK CONFIG ]*
