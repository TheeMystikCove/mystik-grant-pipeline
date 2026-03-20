-- NEXIS Model Registry
-- Source-of-truth table for all available AI models per provider.
-- Mirrors the TypeScript model-registry.ts — enables admin toggling without deploys.

create table if not exists nexis_model_registry (
  id                         uuid primary key default gen_random_uuid(),
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now(),

  model_id                   text not null unique,  -- e.g. 'claude-sonnet-4-6'
  provider                   text not null references nexis_provider_registry(provider),
  display_name               text not null,
  tier                       text not null,         -- 'flagship' | 'balanced' | 'fast'
  enabled                    boolean not null default true,

  context_window             integer not null,
  max_output_tokens          integer not null,
  max_context_class          text not null,         -- 'small' | 'medium' | 'large' | 'xlarge'

  supports_vision            boolean not null default false,
  supports_tools             boolean not null default false,
  supports_structured_output boolean not null default false,

  cost_per_1k_input_tokens   numeric(10, 7) not null,
  cost_per_1k_output_tokens  numeric(10, 7) not null
);

-- Enable RLS
alter table nexis_model_registry enable row level security;

-- Admins/founders can manage models
create policy "admin_full_access" on nexis_model_registry
  for all using (
    exists (
      select 1 from nexis_users
      where id = auth.uid()
      and role in ('founder', 'admin')
    )
  );

-- All authenticated users can read model registry
create policy "authenticated_read" on nexis_model_registry
  for select using (auth.uid() is not null);

-- Seed models
insert into nexis_model_registry
  (model_id, provider, display_name, tier, enabled,
   context_window, max_output_tokens, max_context_class,
   supports_vision, supports_tools, supports_structured_output,
   cost_per_1k_input_tokens, cost_per_1k_output_tokens)
values
  -- Claude
  ('claude-opus-4-6',          'claude', 'Claude Opus 4.6',    'flagship', true, 200000, 32000, 'xlarge', true,  true,  true,  0.0150000, 0.0750000),
  ('claude-sonnet-4-6',        'claude', 'Claude Sonnet 4.6',  'balanced', true, 200000,  8096, 'xlarge', true,  true,  true,  0.0030000, 0.0150000),
  ('claude-haiku-4-5-20251001','claude', 'Claude Haiku 4.5',   'fast',     true, 200000,  8096, 'xlarge', true,  true,  true,  0.0002500, 0.0012500),
  -- OpenAI
  ('gpt-4o',                   'openai', 'GPT-4o',             'flagship', true, 128000, 16384, 'large',  true,  true,  true,  0.0025000, 0.0100000),
  ('gpt-4o-mini',              'openai', 'GPT-4o Mini',        'fast',     true, 128000, 16384, 'large',  true,  true,  true,  0.0001500, 0.0006000),
  -- Gemini
  ('gemini-2.0-flash',         'gemini', 'Gemini 2.0 Flash',   'balanced', true,1000000,  8192, 'xlarge', true,  true,  true,  0.0000750, 0.0003000),
  ('gemini-1.5-pro',           'gemini', 'Gemini 1.5 Pro',     'flagship', true,2000000,  8192, 'xlarge', true,  true,  true,  0.0012500, 0.0050000),
  -- Perplexity
  ('sonar-pro',                'perplexity', 'Sonar Pro',       'flagship', true, 127072,  8000, 'large',  false, false, false, 0.0030000, 0.0150000),
  ('sonar',                    'perplexity', 'Sonar',           'fast',     true, 127072,  8000, 'large',  false, false, false, 0.0010000, 0.0010000)
on conflict (model_id) do nothing;
