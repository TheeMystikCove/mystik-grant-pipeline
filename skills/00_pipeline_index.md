# Mystik Grant Engine — Full Skills Index

**Version:** 3.0
**Last Updated:** 2026-03-15
**Changelog:** Added Discovery Layer (D01, D02, D03); expanded to full two-layer Grant Engine; updated data flow, activation rules, and approval gates

A quick reference for all 16 agents across both layers. Each skill file is self-contained and ready to drop into a system prompt or agent config.

---

## Layer 1 — Discovery Layer

| # | Skill File | Agent Name | Job in One Line | Activation |
|---|-----------|------------|-----------------|-----------|
| D01 | `skill_D01_grant_opportunity_scout.md` | Grant Opportunity Scout | Finds and filters grant opportunities by mission, geography, and program fit | On demand or scheduled |
| D02 | `skill_D02_eligibility_readiness_checker.md` | Eligibility & Readiness Checker | Validates legal eligibility and organizational readiness; issues Go / No-Go | After D01 |
| D03 | `skill_D03_grant_match_prioritizer.md` | Grant Match Prioritizer | Scores and ranks opportunities; selects one for the Proposal Pipeline | After D02 — human approval required before pipeline launches |

---

## Layer 2 — Proposal Pipeline

| # | Skill File | Agent Name | Job in One Line | Activation |
|---|-----------|------------|-----------------|-----------|
| 01 | `skill_01_intake_orchestrator.md` | Intake Orchestrator | Collects raw input, builds the ProjectBrief, classifies uploaded documents | After D03 human approval |
| 1.5 | `skill_01_5_grant_requirements_parser.md` | Grant Requirements Parser | Extracts every requirement from an uploaded RFP, NOFA, or funder guidelines | Conditional — only if `rfp_attached: true` |
| 02 | `skill_02_funder_fit_analyzer.md` | Funder Fit Analyzer | Scores funder alignment, sets proposal strategy and tone | Always |
| 2.5 | `skill_02_5_research_evidence_scout.md` | Research & Evidence Scout | Builds the Evidence Library of statistics, citations, and evidence-based practices | Always |
| 03 | `skill_03_program_architect.md` | Program Architect | Designs the program model, Theory of Change, and Logic Model | Always |
| 04 | `skill_04_narrative_strategist.md` | Narrative Strategist | Writes the human story and draft language blocks | Parallel tier |
| 05 | `skill_05_budget_architect.md` | Budget Architect | Builds the draft budget and justification | Parallel tier |
| 06 | `skill_06_evaluation_designer.md` | Evaluation Designer | Creates SMART objectives, KPIs, and evaluation plan | Parallel tier |
| 07 | `skill_07_compliance_qa_reviewer.md` | Compliance & QA Reviewer | Audits all outputs for gaps, consistency, and funder compliance | Always — gates Skill 08 |
| 08 | `skill_08_proposal_compiler.md` | Proposal Compiler | Assembles validated sections into one near-final document | After Skill 07 Approve |
| 09 | `skill_09_revision_manager.md` | Revision Manager | Presents draft to the user — Revise or Approve? | Always |
| 10 | `skill_10_final_grant_writer.md` | Final Grant Writer | Polishes and delivers the submission-ready proposal | After explicit user approval |

---

## Post-Pipeline (Optional)

| # | Skill File | Agent Name | Job in One Line | Activation |
|---|-----------|------------|-----------------|-----------|
| 11 | `skill_11_multi_funder_adapter.md` | Multi-Funder Adapter | Adapts an approved proposal for a second or third funder | Conditional — on user request after Skill 10 |

---

## Full Engine Data Flow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LAYER 1 — DISCOVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organization Profile + Search Input
    |
[D01] Grant Opportunity Scout
      -> Opportunity List (Viable)
    |
[D02] Eligibility & Readiness Checker
      -> Go / Conditional Go / No-Go per opportunity
      -> Fixable Gaps -> Ops Team
    |
[D03] Grant Match Prioritizer
      -> Ranked Opportunity Table + Top Recommendation
    |
*** HUMAN APPROVAL GATE 1 ***
    User selects opportunity to pursue
    |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LAYER 2 — PROPOSAL PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[01] Intake Orchestrator -> ProjectBrief
    |
    +-- IF rfp_attached: true
    |       |
    |   [1.5] Grant Requirements Parser -> Requirements Registry
    |       |
    +-- [02] Funder Fit Analyzer -> Positioning Strategy + Alignment Score
            |
        [2.5] Research & Evidence Scout -> Evidence Library
            |
        [03] Program Architect -> Program Model + Theory of Change + Logic Model
            |
    +-------------------------------------------+
    |         PARALLEL EXECUTION               |
    |  [04] Narrative Strategist               |
    |  [05] Budget Architect                   |
    |  [06] Evaluation Designer                |
    +-------------------------------------------+
            |
        [07] Compliance & QA Reviewer
              -> QA Report + Routing Instructions
            |
        [08] Proposal Compiler
              -> Near-Final Draft + Word Count Report + Appendix Inventory
            |
        [09] Revision Manager -> User Decision
            |
    +-- OPTION A: Revise
    |   -> route to responsible skill(s)
    |   -> re-run Skill 07 if Major revision
    |   -> return to Skill 09
    |
    +-- OPTION B: Approve
        *** HUMAN APPROVAL GATE 2 ***
        [10] Final Grant Writer
             -> Submission-Ready Proposal
             |
             (optional)
        [11] Multi-Funder Adapter
```

---

## Activation Rules

| Skill | Activation Condition |
|-------|---------------------|
| D01 | On demand — user initiates opportunity search |
| D02 | After D01 completes — receives viable opportunity list |
| D03 | After D02 completes — receives Go / Conditional Go opportunities |
| **GATE 1** | **Human approves selected opportunity — Skill 01 does not launch without this** |
| Skill 01 | After Gate 1 human approval |
| Skill 1.5 | Conditional — only when `rfp_attached: true` in ProjectBrief |
| Skill 02 | Always — after Skill 01 (and Skill 1.5 if it ran) |
| Skill 2.5 | Always — after Skill 02 |
| Skill 03 | Always — requires outputs from Skills 01, 02, and 2.5 |
| Skills 04/05/06 | Parallel — all three activate simultaneously after Skill 03 |
| Skill 07 | Always — requires all outputs from Skills 01–06 (and 1.5, 2.5 if they ran) |
| Skill 08 | After Skill 07 Approve or Approve-with-Minors |
| Skill 09 | Always — after Skill 08 |
| **GATE 2** | **Human explicitly approves compiled draft — Skill 10 does not self-activate** |
| Skill 10 | After Gate 2 human approval only |
| Skill 11 | Conditional — on explicit user request after Skill 10 |

---

## Human Approval Gates

Two required human decision points in the full engine. Neither can be bypassed.

**Gate 1 — Discovery to Pipeline (Skill D03 → Skill 01)**
The Proposal Pipeline does not launch until a human confirms the selected opportunity. Prevents wasted writing effort on unvetted grants.

**Gate 2 — Pipeline to Final (Skill 09 → Skill 10)**
The Final Grant Writer does not activate until a human explicitly approves the compiled draft. Prevents auto-generated grant submissions.

---

## Standard Trailer Fields

Every skill appends these four fields at the end of its output:

```
## Confidence Level
[High / Medium / Low]

## Key Assumptions
[Bulleted list]

## Missing Information
[Bulleted list of unresolved gaps]

## Pipeline Position
[Receives from: ... / Sends to: ...]
```

---

## Parallel Tier Note

Skills 04, 05, and 06 run simultaneously after Skill 03. They send outputs independently to Skill 07. Skill 08 does not receive directly from Skills 04/05/06 — it receives through the Skill 07 approval gate.

---

## Requirements Registry Propagation

When Skill 1.5 runs, its Requirements Registry is injected into Skills 02 through 10. It is the authoritative source for section order, word limits, budget constraints, and required attachments.

---

## Revision Loop

When Skill 09 routes a revision back upstream: only affected skills re-run. Skill 07 re-runs after any Major revision. Unaffected skills do not re-run. All iterations are versioned in proposal_versions.

---

## Skill File Naming Convention

```
Discovery Layer:      skill_D[##]_[agent_name].md      (D01, D02, D03)
Pipeline (main):      skill_[##]_[agent_name].md        (01 through 10)
Pipeline (inserted):  skill_[##]_[#]_[agent_name].md   (01_5, 02_5)
Post-pipeline:        skill_[11+]_[agent_name].md       (11+)
```
