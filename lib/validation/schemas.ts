import { z } from "zod";

export const OpportunitySchema = z.object({
  funder_name: z.string().min(1, "Funder name is required"),
  opportunity_name: z.string().min(1, "Opportunity name is required"),
  funder_type: z.enum([
    "federal", "state", "local", "private_foundation",
    "corporate", "community_foundation", "other",
  ]).optional(),
  deadline_at: z.string().optional(),
  award_min: z.number().nonnegative().optional(),
  award_max: z.number().nonnegative().optional(),
  geography: z.string().optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  eligibility_text: z.string().optional(),
  requirements_text: z.string().optional(),
});

export const ProposalProjectSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  opportunity_id: z.string().uuid().optional(),
  requested_amount: z.number().nonnegative().optional(),
});

export const ProjectIntakeSchema = z.object({
  organization_name: z.string().min(1),
  project_name: z.string().min(1),
  funder_name: z.string().min(1),
  funder_type: z.string().optional(),
  funding_amount_requested: z.string().optional(),
  target_population: z.string().optional(),
  geographic_area: z.string().optional(),
  problem_statement: z.string().optional(),
  program_activities: z.string().optional(),
  expected_outcomes: z.string().optional(),
  project_timeline: z.string().optional(),
  partners: z.string().optional(),
  rfp_attached: z.boolean().default(false),
  application_deadline: z.string().optional(),
});

export const ScoreInputSchema = z.object({
  strategic_fit: z.number().min(1).max(10),
  eligibility_confidence: z.number().min(1).max(10),
  internal_readiness: z.number().min(1).max(10),
  value_vs_effort: z.number().min(1).max(10),
  deadline_urgency: z.number().min(1).max(10),
});

export type OpportunityInput = z.infer<typeof OpportunitySchema>;
export type ProposalProjectInput = z.infer<typeof ProposalProjectSchema>;
export type ProjectIntakeInput = z.infer<typeof ProjectIntakeSchema>;
export type ScoreInput = z.infer<typeof ScoreInputSchema>;
