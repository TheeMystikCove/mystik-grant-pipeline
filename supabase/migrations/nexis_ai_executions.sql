-- NEXIS AI Executions — Execution Log Table
-- Run this in the Supabase SQL editor before using the AI Gateway.
-- Migration: nexis_ai_executions

create table if not exists nexis_ai_executions (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz default now(),

  -- Request identity
  request_id           text not null,
  response_id          text not null,
  user_id              uuid references auth.users(id),
  session_id           text,
  branch               text,    -- CORE | ACADEMY | HARBOR | STUDIOS | MARKET | OPS
  agent_name           text,    -- NEXIS_[DOMAIN]_AGENT_[ROLE]_V1

  -- Task context
  task_type            text not null,
  prompt_preview       text,    -- first 500 chars of prompt

  -- Routing decision
  selected_provider    text not null,  -- claude | openai | gemini | perplexity
  selected_model       text not null,
  fallback_provider    text not null,
  fallback_used        boolean default false,
  fallback_reason      text,
  routing_rationale    text,

  -- Outcome
  status               text not null,  -- success | error | partial
  error                text,
  output_format        text,           -- markdown | json | text
  sensitivity          text,           -- low | medium | high
  requires_citations   boolean default false,
  requires_tools       boolean default false,

  -- Token usage & cost
  input_tokens         integer,
  output_tokens        integer,
  total_tokens         integer,
  estimated_cost_usd   numeric(10, 6),
  latency_ms           integer,

  -- Timestamp from provider response
  timestamp            timestamptz
);

-- Indexes
create index if not exists idx_nexis_executions_user_id
  on nexis_ai_executions(user_id);

create index if not exists idx_nexis_executions_provider
  on nexis_ai_executions(selected_provider, created_at);

create index if not exists idx_nexis_executions_task_type
  on nexis_ai_executions(task_type, created_at);

create index if not exists idx_nexis_executions_agent
  on nexis_ai_executions(agent_name) where agent_name is not null;

-- Row Level Security
alter table nexis_ai_executions enable row level security;

-- Founders and admins see everything
create policy "admin_full_access" on nexis_ai_executions
  for all using (
    exists (
      select 1 from nexis_users
      where id = auth.uid()
      and role in ('founder', 'admin')
    )
  );

-- Users can see their own executions
create policy "user_own_executions" on nexis_ai_executions
  for select using (user_id = auth.uid());
