-- ─── Grant Engine — Initial Schema ──────────────────────────────────────────
-- Migration: 001_initial_schema.sql
-- Run via: supabase db push  OR  paste into Supabase SQL editor

-- ─── Organizations ───────────────────────────────────────────────────────────

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  entity_type text,
  mission text,
  vision text,
  values_json jsonb default '[]'::jsonb,
  geography text,
  annual_budget_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Users ───────────────────────────────────────────────────────────────────

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text,
  email text not null,
  role text not null check (role in (
    'founder_admin', 'grant_strategist', 'program_lead', 'reviewer', 'ops_assistant'
  )),
  created_at timestamptz not null default now()
);

-- ─── Organization Profiles ───────────────────────────────────────────────────

create table organization_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  registrations_json jsonb default '{}'::jsonb,
  target_populations_json jsonb default '[]'::jsonb,
  strategic_priorities_json jsonb default '[]'::jsonb,
  readiness_notes text,
  notion_page_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Opportunities ───────────────────────────────────────────────────────────

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  funder_name text not null,
  name text not null,
  program_area text,
  funder_type text check (funder_type in (
    'federal', 'state', 'local', 'private_foundation', 'corporate', 'community_foundation', 'other'
  )),
  deadline timestamptz,
  award_min numeric,
  award_max numeric,
  geography text,
  source_url text,
  notes text,
  eligibility_text text,
  requirements_text text,
  status text not null default 'new' check (status in (
    'new', 'screening', 'eligible', 'not_eligible', 'prioritized', 'pursuing', 'submitted', 'awarded', 'declined', 'monitoring', 'rejected', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Opportunity Scores ──────────────────────────────────────────────────────

create table opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  strategic_fit_score numeric not null default 0 check (strategic_fit_score between 0 and 100),
  eligibility_score numeric not null default 0 check (eligibility_score between 0 and 100),
  readiness_score numeric not null default 0 check (readiness_score between 0 and 100),
  award_value_score numeric not null default 0 check (award_value_score between 0 and 100),
  urgency_score numeric not null default 0 check (urgency_score between 0 and 100),
  total_score numeric not null default 0 check (total_score between 0 and 100),
  label text,
  rationale text,
  created_at timestamptz not null default now()
);

-- ─── Readiness Checks ────────────────────────────────────────────────────────

create table readiness_checks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  eligibility_status text not null check (eligibility_status in ('eligible', 'conditional', 'ineligible')),
  readiness_status text check (readiness_status in ('ready', 'conditional', 'not_ready')),
  recommendation text check (recommendation in ('go', 'conditional_go', 'no_go')),
  registrations_complete boolean default false,
  attachments_complete boolean default false,
  financials_complete boolean default false,
  uei_registered boolean default false,
  irs_letter_on_file boolean default false,
  recent_audit_on_file boolean default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ─── Proposal Projects ───────────────────────────────────────────────────────

create table proposal_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  project_name text not null,
  status text not null default 'draft' check (status in (
    'draft', 'in_pipeline', 'awaiting_review', 'revision_requested',
    'approved_for_final', 'finalized', 'exported'
  )),
  current_stage text,
  requested_amount numeric,
  final_decision text check (final_decision in ('approved', 'rejected', 'withdrawn', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Project Intake ──────────────────────────────────────────────────────────

create table project_intake (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  project_snapshot_json jsonb default '{}'::jsonb,
  problem_summary text,
  initial_program_idea text,
  missing_information_json jsonb default '[]'::jsonb,
  assumptions_json jsonb default '[]'::jsonb,
  rfp_attached boolean default false,
  application_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Agent Runs ──────────────────────────────────────────────────────────────

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  agent_name text not null,
  input_payload_json jsonb default '{}'::jsonb,
  output_payload_json jsonb default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'error')),
  confidence_level text check (confidence_level in ('high', 'medium', 'low')),
  error_message text,
  created_at timestamptz not null default now()
);

-- ─── Proposal Sections ───────────────────────────────────────────────────────

create table proposal_sections (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  section_name text not null,
  draft_text text,
  word_count integer,
  word_limit integer,
  source_agent text,
  revision_number integer not null default 1,
  approved boolean not null default false,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proposal_project_id, section_name, revision_number)
);

-- ─── QA Reports ──────────────────────────────────────────────────────────────

create table qa_reports (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  qa_summary text,
  missing_elements_json jsonb default '[]'::jsonb,
  risk_flags_json jsonb default '[]'::jsonb,
  revision_checklist_json jsonb default '[]'::jsonb,
  requirements_registry_compliance_json jsonb default '[]'::jsonb,
  cross_skill_consistency_json jsonb default '[]'::jsonb,
  approval_recommendation text check (approval_recommendation in (
    'approve', 'revise_and_resubmit', 'hold'
  )),
  created_at timestamptz not null default now()
);

-- ─── Revision Requests ───────────────────────────────────────────────────────

create table revision_requests (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  section_name text,
  issue_type text check (issue_type in ('critical', 'important', 'minor')),
  responsible_skill text,
  scope text check (scope in ('minor', 'major')),
  cascade_effects text,
  user_note text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Proposal Versions ───────────────────────────────────────────────────────

create table proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_project_id uuid not null references proposal_projects(id) on delete cascade,
  version_number integer not null,
  compiled_text text,
  summary text,
  word_count_report_json jsonb,
  appendix_inventory_json jsonb,
  approved boolean not null default false,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (proposal_project_id, version_number)
);

-- ─── Files ───────────────────────────────────────────────────────────────────

create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  proposal_project_id uuid references proposal_projects(id) on delete cascade,
  file_name text not null,
  file_type text,
  storage_path text not null,
  category text check (category in (
    'rfp', 'determination_letter', 'audit', '990', 'mou',
    'board_list', 'org_chart', 'prior_proposal', 'other'
  )),
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Notion Sync Jobs ────────────────────────────────────────────────────────

create table notion_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  proposal_project_id uuid references proposal_projects(id) on delete cascade,
  sync_type text not null check (sync_type in (
    'opportunity', 'proposal_status', 'review_checklist', 'final_summary'
  )),
  notion_target_id text,
  payload_json jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'synced', 'error')),
  last_synced_at timestamptz,
  error_message text
);

-- ─── Updated At Triggers ─────────────────────────────────────────────────────

create or replace function handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on organizations
  for each row execute function handle_updated_at();

create trigger organization_profiles_updated_at before update on organization_profiles
  for each row execute function handle_updated_at();

create trigger opportunities_updated_at before update on opportunities
  for each row execute function handle_updated_at();

create trigger proposal_projects_updated_at before update on proposal_projects
  for each row execute function handle_updated_at();

create trigger project_intake_updated_at before update on project_intake
  for each row execute function handle_updated_at();

create trigger proposal_sections_updated_at before update on proposal_sections
  for each row execute function handle_updated_at();

create trigger revision_requests_updated_at before update on revision_requests
  for each row execute function handle_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_profiles enable row level security;
alter table opportunities enable row level security;
alter table opportunity_scores enable row level security;
alter table readiness_checks enable row level security;
alter table proposal_projects enable row level security;
alter table project_intake enable row level security;
alter table agent_runs enable row level security;
alter table proposal_sections enable row level security;
alter table qa_reports enable row level security;
alter table revision_requests enable row level security;
alter table proposal_versions enable row level security;
alter table files enable row level security;
alter table notion_sync_jobs enable row level security;

-- Helper: get current user's org
create or replace function current_user_org_id()
returns uuid
language sql
security definer stable
as $$
  select organization_id from users where auth_user_id = auth.uid() limit 1;
$$;

-- Helper: get current user's role
create or replace function current_user_role()
returns text
language sql
security definer stable
as $$
  select role from users where auth_user_id = auth.uid() limit 1;
$$;

-- Organizations: members can view their own org
create policy "org_members_select" on organizations for select
  using (id = current_user_org_id());

-- Organizations: only founder_admin can update
create policy "org_founder_update" on organizations for update
  using (id = current_user_org_id() and current_user_role() = 'founder_admin');

-- Users: can view teammates in same org
create policy "users_select_same_org" on users for select
  using (organization_id = current_user_org_id());

-- Opportunities: org members can view
create policy "opportunities_select" on opportunities for select
  using (organization_id = current_user_org_id());

-- Opportunities: strategist and admin can insert/update
create policy "opportunities_insert" on opportunities for insert
  with check (
    organization_id = current_user_org_id()
    and current_user_role() in ('founder_admin', 'grant_strategist')
  );

create policy "opportunities_update" on opportunities for update
  using (
    organization_id = current_user_org_id()
    and current_user_role() in ('founder_admin', 'grant_strategist')
  );

-- Proposal projects: org members can view
create policy "proposals_select" on proposal_projects for select
  using (organization_id = current_user_org_id());

-- Proposal projects: strategist and admin can create
create policy "proposals_insert" on proposal_projects for insert
  with check (
    organization_id = current_user_org_id()
    and current_user_role() in ('founder_admin', 'grant_strategist')
  );

-- Proposal sections: org members can view
create policy "sections_select" on proposal_sections for select
  using (
    proposal_project_id in (
      select id from proposal_projects where organization_id = current_user_org_id()
    )
  );

-- Agent runs: org members can view
create policy "agent_runs_select" on agent_runs for select
  using (
    proposal_project_id in (
      select id from proposal_projects where organization_id = current_user_org_id()
    )
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index opportunities_org_idx on opportunities (organization_id);
create index opportunities_status_idx on opportunities (status);
create index opportunities_deadline_idx on opportunities (deadline);
create index proposal_projects_org_idx on proposal_projects (organization_id);
create index proposal_projects_status_idx on proposal_projects (status);
create index agent_runs_project_idx on agent_runs (proposal_project_id);
create index agent_runs_agent_name_idx on agent_runs (agent_name);
create index proposal_sections_project_idx on proposal_sections (proposal_project_id);
