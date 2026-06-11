-- ─── Grant Engine — Projects + Project Opportunities ─────────────────────────
-- Migration: 007_projects_and_matches.sql
-- Run via: supabase db push  OR  paste into Supabase SQL editor

-- ─── Projects ─────────────────────────────────────────────────────────────────

create table projects (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  title                text not null,
  description          text,
  status               text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  tags                 text[] not null default '{}',
  program_area         text,
  target_population    text,
  estimated_budget     numeric,
  timeline             text,
  problem_statement    text,
  theory_of_change     text,
  target_outcomes      text,
  budget_framework     text,
  source_document_url  text,
  source_document_text text,
  initiative_brief     jsonb,
  conversation_history jsonb not null default '[]'::jsonb,
  architect_stage      text not null default 'intro' check (architect_stage in (
    'intro', 'problem', 'population', 'outcomes', 'budget', 'timeline', 'complete'
  )),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── Project Opportunities (AI-matched grant links) ───────────────────────────

create table project_opportunities (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  opportunity_id   uuid not null references opportunities(id) on delete cascade,
  match_score      numeric,
  match_rationale  text,
  matched_at       timestamptz not null default now(),
  unique (project_id, opportunity_id)
);

-- ─── Updated At Triggers ──────────────────────────────────────────────────────

create trigger projects_updated_at before update on projects
  for each row execute function handle_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table projects enable row level security;
alter table project_opportunities enable row level security;

-- Projects: org members can view their org's projects
create policy "projects_select" on projects for select
  using (organization_id = current_user_org_id());

-- Projects: strategist and admin can create
create policy "projects_insert" on projects for insert
  with check (
    organization_id = current_user_org_id()
    and current_user_role() in ('founder_admin', 'grant_strategist')
  );

-- Projects: strategist and admin can update
create policy "projects_update" on projects for update
  using (
    organization_id = current_user_org_id()
    and current_user_role() in ('founder_admin', 'grant_strategist')
  );

-- Project opportunities: visible to org members via project membership
create policy "project_opportunities_select" on project_opportunities for select
  using (
    project_id in (
      select id from projects where organization_id = current_user_org_id()
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index projects_org_idx on projects (organization_id);
create index projects_status_idx on projects (status);
create index project_opportunities_project_idx on project_opportunities (project_id);
create index project_opportunities_opportunity_idx on project_opportunities (opportunity_id);
create index project_opportunities_score_idx on project_opportunities (match_score desc);