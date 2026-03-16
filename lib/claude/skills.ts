import { readFileSync, existsSync } from "fs";
import path from "path";

const rawSkillsDir =
  process.env.SKILLS_DIR ??
  path.resolve(process.cwd(), "../Mystik Grant Pipeline/skills");

// Resolve relative paths against cwd so "./skills" works on Vercel
const SKILLS_DIR = path.isAbsolute(rawSkillsDir)
  ? rawSkillsDir
  : path.resolve(process.cwd(), rawSkillsDir);

// Map agent name → skill filename
const SKILL_FILES: Record<string, string> = {
  grant_opportunity_scout: "skill_D01_grant_opportunity_scout.md",
  eligibility_readiness_checker: "skill_D02_eligibility_readiness_checker.md",
  grant_match_prioritizer: "skill_D03_grant_match_prioritizer.md",
  intake_orchestrator: "skill_01_intake_orchestrator.md",
  grant_requirements_parser: "skill_01_5_grant_requirements_parser.md",
  funder_fit_analyzer: "skill_02_funder_fit_analyzer.md",
  research_evidence_scout: "skill_02_5_research_evidence_scout.md",
  program_architect: "skill_03_program_architect.md",
  narrative_strategist: "skill_04_narrative_strategist.md",
  budget_architect: "skill_05_budget_architect.md",
  evaluation_designer: "skill_06_evaluation_designer.md",
  compliance_qa_reviewer: "skill_07_compliance_qa_reviewer.md",
  proposal_compiler: "skill_08_proposal_compiler.md",
  revision_manager: "skill_09_revision_manager.md",
  final_grant_writer: "skill_10_final_grant_writer.md",
  multi_funder_adapter: "skill_11_multi_funder_adapter.md",
};

export function loadSkillPrompt(agentName: string): string {
  const filename = SKILL_FILES[agentName];
  if (!filename) {
    throw new Error(`No skill file mapped for agent: ${agentName}`);
  }

  const filePath = path.join(SKILLS_DIR, filename);
  if (!existsSync(filePath)) {
    throw new Error(`Skill file not found: ${filePath}`);
  }

  return readFileSync(filePath, "utf-8");
}
