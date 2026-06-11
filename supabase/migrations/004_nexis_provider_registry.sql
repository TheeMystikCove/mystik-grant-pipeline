-- NEXIS Provider Registry
-- Source-of-truth table for available AI providers.
-- Mirrors the TypeScript provider-registry.ts — useful for admin UI and analytics.

create table if not exists nexis_provider_registry (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),

  provider             text not null unique,  -- 'claude' | 'openai' | 'gemini' | 'perplexity'
  display_name         text not null,
  enabled              boolean not null default true,

  strengths            text[],               -- e.g. ['architecture', 'long-form', 'codex']
  default_task_types   text[],               -- task types this provider excels at
  fallback_provider    text,                 -- which provider to fall back to

  supports_citations   boolean not null default false,
  supports_tools       boolean not null default false,
  supports_streaming   boolean not null default false,

  cost_class           text not null,        -- 'low' | 'medium' | 'high'
  latency_class        text not null,        -- 'fast' | 'medium' | 'slow'

  max_context_tokens   integer,
  api_base_url         text                  -- null = default SDK endpoint
);

-- Enable RLS
alter table nexis_provider_registry enable row level security;

-- Admins/founders can manage providers
create policy "admin_full_access" on nexis_provider_registry
  for all using (
    exists (
      select 1 from nexis_users
      where id = auth.uid()
      and role in ('founder', 'admin')
    )
  );

-- All authenticated users can read provider registry
create policy "authenticated_read" on nexis_provider_registry
  for select using (auth.uid() is not null);

-- Seed initial providers
insert into nexis_provider_registry
  (provider, display_name, enabled, strengths, default_task_types, fallback_provider,
   supports_citations, supports_tools, supports_streaming, cost_class, latency_class, max_context_tokens)
values
  (
    'claude', 'Anthropic Claude', true,
    array['architecture', 'long-form', 'codex', 'trauma-informed', 'curriculum'],
    array['general', 'curriculum', 'grant', 'trauma'],
    'openai', false, true, true, 'medium', 'medium', 200000
  ),
  (
    'openai', 'OpenAI GPT', true,
    array['workflow', 'tools', 'structured-output', 'publishing'],
    array['workflow', 'publishing', 'general'],
    'claude', false, true, true, 'medium', 'fast', 128000
  ),
  (
    'gemini', 'Google Gemini', true,
    array['grounding', 'code', 'multimodal', 'long-context'],
    array['code', 'grounding'],
    'openai', false, true, true, 'low', 'fast', 1000000
  ),
  (
    'perplexity', 'Perplexity Sonar', true,
    array['research', 'citations', 'real-time-web', 'grant-scouting'],
    array['research', 'seo', 'grant'],
    'claude', true, false, false, 'medium', 'medium', 127072
  )
on conflict (provider) do nothing;
