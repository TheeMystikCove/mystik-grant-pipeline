-- NEXIS Execution Logs
-- Spec: section 14 — field names match spec exactly.
-- provider, model, fallback_used, routing_reason, prompt_excerpt, output_excerpt

create table if not exists nexis_execution_logs (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz default now(),

  request_id           text not null,
  user_id              uuid references auth.users(id),
  session_id           text,
  branch               text,
  agent_name           text,
  task_type            text not null,

  -- Spec §14 field names
  provider             text not null,
  model                text not null,
  fallback_provider    text,
  fallback_used        boolean default false,
  routing_reason       text,

  -- Content excerpts (spec §14)
  prompt_excerpt       text,
  output_excerpt       text,

  -- Status
  success              boolean not null,
  error                text,
  latency_ms           integer,
  estimated_cost       numeric(10, 6),

  -- Extended analytics
  input_tokens         integer,
  output_tokens        integer,
  total_tokens         integer,
  output_format        text,
  sensitivity          text,
  requires_citations   boolean default false,
  requires_tools       boolean default false
);

create index if not exists idx_nexis_exec_logs_user_id
  on nexis_execution_logs(user_id);

create index if not exists idx_nexis_exec_logs_provider
  on nexis_execution_logs(provider, created_at);

create index if not exists idx_nexis_exec_logs_success
  on nexis_execution_logs(success, created_at);

alter table nexis_execution_logs enable row level security;

create policy "admin_full_access" on nexis_execution_logs
  for all using (
    exists (
      select 1 from nexis_users
      where id = auth.uid()
      and role in ('founder', 'admin')
    )
  );

create policy "user_own_logs" on nexis_execution_logs
  for select using (user_id = auth.uid());
