// ─── Domain Types ────────────────────────────────────────────────────────────

export type UserRole =
  | "founder_admin"
  | "grant_strategist"
  | "program_lead"
  | "reviewer"
  | "ops_assistant";

export type OpportunityStatus =
  | "new"
  | "screening"
  | "eligible"
  | "not_eligible"
  | "prioritized"
  | "rejected"
  | "archived";

export type ProposalStatus =
  | "draft"
  | "in_pipeline"
  | "awaiting_review"
  | "revision_requested"
  | "approved_for_final"
  | "finalized"
  | "exported";

export type AgentName =
  | "grant_opportunity_scout"
  | "eligibility_readiness_checker"
  | "grant_match_prioritizer"
  | "intake_orchestrator"
  | "grant_requirements_parser"
  | "funder_fit_analyzer"
  | "research_evidence_scout"
  | "program_architect"
  | "narrative_strategist"
  | "budget_architect"
  | "evaluation_designer"
  | "compliance_qa_reviewer"
  | "proposal_compiler"
  | "revision_manager"
  | "final_grant_writer"
  | "multi_funder_adapter";

export type AgentStatus = "queued" | "running" | "complete" | "error";

export type ConfidenceLevel = "high" | "medium" | "low";

export type ApprovalRecommendation =
  | "approve"
  | "revise_and_resubmit"
  | "hold";

export type FunderType =
  | "federal"
  | "state"
  | "local"
  | "private_foundation"
  | "corporate"
  | "community_foundation"
  | "other";

export type RevisionScope = "minor" | "major";

export type SyncType =
  | "opportunity"
  | "proposal_status"
  | "review_checklist"
  | "final_summary";

// ─── Shared Agent Output Standard ────────────────────────────────────────────

export interface AgentOutput {
  summary: string;
  assumptions: string[];
  missing_information: string[];
  recommendations: string[];
  structured_output: Record<string, unknown>;
  handoff_payload: Record<string, unknown>;
  confidence_level: ConfidenceLevel;
}

// ─── ProjectBrief ─────────────────────────────────────────────────────────────

export interface ProjectBrief {
  organization_name: string;
  organization_type: string;
  mission_statement: string;
  years_in_operation: string;
  staff_size: string;
  annual_budget: string;
  tax_exempt_status: string;
  prior_grant_history: string;
  project_name: string;
  program_concept: string;
  target_population: string;
  geographic_area: string;
  estimated_reach: string;
  problem_statement: string;
  program_activities: string;
  expected_outcomes: string;
  funder_name: string;
  funder_type: FunderType | "";
  funding_amount_requested: string;
  project_timeline: string;
  partners: string;
  evidence_available: string;
  sustainability_notes: string;
  multi_funder: boolean;
  rfp_attached: boolean;
  rfp_document_type: string;
  rfp_parsed: boolean;
  application_deadline: string;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Organization {
  id: string;
  legal_name: string;
  display_name: string | null;
  entity_type: string | null;
  mission: string | null;
  vision: string | null;
  values_json: string[];
  geography: string | null;
  annual_budget_range: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationProfile {
  id: string;
  organization_id: string;
  registrations_json: Record<string, string>;
  target_populations_json: string[];
  strategic_priorities_json: string[];
  readiness_notes: string | null;
  notion_page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_user_id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
}

export type VerificationStatus = "unverified" | "source_verified" | "manually_reviewed";

export interface Opportunity {
  id: string;
  organization_id: string;
  funder_name: string;
  name: string;
  program_area: string | null;
  funder_type: FunderType | null;
  deadline: string | null;
  award_min: number | null;
  award_max: number | null;
  geography: string | null;
  source_url: string | null;
  notes: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
  status: string;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface OpportunityScore {
  id: string;
  opportunity_id: string;
  strategic_fit_score: number;
  eligibility_score: number;
  readiness_score: number;
  award_value_score: number;
  urgency_score: number;
  total_score: number;
  label: string | null;
  rationale: string | null;
  created_at: string;
}

export interface ReadinessCheck {
  id: string;
  opportunity_id: string;
  eligibility_status: "eligible" | "conditional" | "ineligible";
  readiness_status: "ready" | "conditional" | "not_ready" | null;
  recommendation: "go" | "conditional_go" | "no_go" | null;
  registrations_complete: boolean;
  attachments_complete: boolean;
  financials_complete: boolean;
  uei_registered: boolean;
  irs_letter_on_file: boolean;
  recent_audit_on_file: boolean;
  notes: string | null;
  created_at: string;
}

export interface ProposalProject {
  id: string;
  organization_id: string;
  opportunity_id: string | null;
  project_name: string;
  status: ProposalStatus;
  current_stage: AgentName | null;
  requested_amount: number | null;
  final_decision: "approved" | "rejected" | "withdrawn" | "pending" | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectIntake {
  id: string;
  proposal_project_id: string;
  project_snapshot_json: Partial<ProjectBrief>;
  problem_summary: string | null;
  initial_program_idea: string | null;
  missing_information_json: string[];
  assumptions_json: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  proposal_project_id: string;
  agent_name: AgentName;
  input_payload_json: Record<string, unknown>;
  output_payload_json: Partial<AgentOutput>;
  status: AgentStatus;
  confidence_level: ConfidenceLevel | null;
  error_message: string | null;
  created_at: string;
}

export interface ProposalSection {
  id: string;
  proposal_project_id: string;
  section_name: string;
  draft_text: string | null;
  word_count: number | null;
  word_limit: number | null;
  source_agent: AgentName | null;
  revision_number: number;
  approved: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QAReport {
  id: string;
  proposal_project_id: string;
  qa_summary: string | null;
  missing_elements_json: string[];
  risk_flags_json: RiskFlag[];
  revision_checklist_json: RevisionItem[];
  requirements_registry_compliance_json: ComplianceItem[];
  cross_skill_consistency_json: ConsistencyCheck[];
  approval_recommendation: ApprovalRecommendation | null;
  created_at: string;
}

export interface RiskFlag {
  issue: string;
  location: string;
  severity: "critical" | "important" | "minor";
  recommended_fix: string;
  responsible_skill: AgentName;
}

export interface RevisionItem {
  severity: "critical" | "important" | "minor";
  description: string;
  responsible_skill: AgentName;
  completed: boolean;
}

export interface ComplianceItem {
  requirement: string;
  source: string;
  status: "met" | "partial" | "missing";
  notes: string;
}

export interface ConsistencyCheck {
  check: string;
  skills_compared: string;
  status: "consistent" | "conflict" | "not_verifiable";
  notes: string;
}

export interface RevisionRequest {
  id: string;
  proposal_project_id: string;
  section_name: string | null;
  issue_type: "critical" | "important" | "minor" | null;
  responsible_skill: AgentName | null;
  scope: RevisionScope | null;
  cascade_effects: string | null;
  user_note: string | null;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface ProposalVersion {
  id: string;
  proposal_project_id: string;
  version_number: number;
  compiled_text: string | null;
  summary: string | null;
  word_count_report_json: WordCountReport | null;
  appendix_inventory_json: AppendixItem[] | null;
  approved: boolean;
  exported_at: string | null;
  created_at: string;
}

export interface WordCountReport {
  sections: { section: string; word_count: number; limit: number | null; status: "within" | "over" | "under" }[];
  total: number;
  total_limit: number | null;
}

export interface AppendixItem {
  attachment: string;
  required: boolean;
  status: "available" | "needs_production" | "needs_external";
  owner: string | null;
}

export interface UploadedFile {
  id: string;
  organization_id: string | null;
  proposal_project_id: string | null;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  category:
    | "rfp"
    | "determination_letter"
    | "audit"
    | "990"
    | "mou"
    | "board_list"
    | "org_chart"
    | "other"
    | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface NotionSyncJob {
  id: string;
  organization_id: string | null;
  proposal_project_id: string | null;
  sync_type: SyncType;
  notion_target_id: string | null;
  payload_json: Record<string, unknown>;
  status: "pending" | "synced" | "error";
  last_synced_at: string | null;
  error_message: string | null;
}
