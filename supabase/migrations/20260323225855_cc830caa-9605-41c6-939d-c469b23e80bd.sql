
-- ============================================================
-- 1. ai_settings — per-workspace AI configuration
-- ============================================================
create table if not exists public.ai_settings (
  workspace_id              uuid primary key references workspaces(id) on delete cascade,
  default_model             text not null default 'claude-sonnet-4-5',
  max_tokens_default        integer not null default 1024,
  max_tokens_analysis       integer not null default 2048,
  max_tokens_generation     integer not null default 4096,
  max_tokens_agents         integer not null default 4096,
  monthly_token_budget      bigint not null default 0,
  current_month_tokens      bigint not null default 0,
  current_month_cost_usd    numeric(10, 4) not null default 0,
  budget_reset_date         date not null default date_trunc('month', now())::date,
  budget_alert_threshold    integer not null default 80,
  budget_alert_sent         boolean not null default false,
  ai_copilot_enabled        boolean not null default true,
  ai_inbox_reply_enabled    boolean not null default true,
  ai_suggestions_enabled    boolean not null default true,
  ai_employees_enabled      boolean not null default true,
  ai_agents_enabled         boolean not null default true,
  ai_sales_coach_enabled    boolean not null default true,
  ai_imo_enabled            boolean not null default true,
  temperature_creative      float not null default 0.7,
  temperature_analytical    float not null default 0.2,
  temperature_balanced      float not null default 0.4,
  response_language         text not null default 'pt-PT',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

create policy "ai_settings_workspace_members_read" on public.ai_settings
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "ai_settings_workspace_admins_write" on public.ai_settings
  for all using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

-- ============================================================
-- 2. ai_usage_logs — immutable log of every AI call
-- ============================================================
create table if not exists public.ai_usage_logs (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  feature             text not null,
  model               text not null,
  provider            text not null default 'lovable',
  tokens_input        integer not null default 0,
  tokens_output       integer not null default 0,
  tokens_total        integer not null default 0,
  cost_usd            numeric(10, 6) not null default 0,
  request_type        text,
  latency_ms          integer,
  was_cached          boolean not null default false,
  entity_type         text,
  entity_id           uuid,
  job_id              uuid,
  was_error           boolean not null default false,
  error_type          text,
  user_id             uuid,
  created_at          timestamptz not null default now()
);

create index if not exists idx_ai_usage_workspace_time
  on public.ai_usage_logs (workspace_id, created_at desc);

create index if not exists idx_ai_usage_feature
  on public.ai_usage_logs (workspace_id, feature, created_at desc);

alter table public.ai_usage_logs enable row level security;

create policy "ai_usage_logs_workspace_members_read" on public.ai_usage_logs
  for select using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Helper functions
-- ============================================================

create or replace function public.increment_ai_usage(
  p_workspace_id uuid,
  p_tokens       bigint,
  p_cost         numeric
) returns void language sql as $$
  insert into public.ai_settings (workspace_id, current_month_tokens, current_month_cost_usd)
  values (p_workspace_id, p_tokens, p_cost)
  on conflict (workspace_id) do update
  set
    current_month_tokens   = ai_settings.current_month_tokens + p_tokens,
    current_month_cost_usd = ai_settings.current_month_cost_usd + p_cost;
$$;

create or replace function public.reset_monthly_ai_budgets()
returns void language sql as $$
  update public.ai_settings
  set
    current_month_tokens   = 0,
    current_month_cost_usd = 0,
    budget_alert_sent      = false,
    budget_reset_date      = date_trunc('month', now())::date
  where budget_reset_date < date_trunc('month', now())::date;
$$;

create or replace function public.get_ai_usage_summary(
  p_workspace_id uuid,
  p_from         timestamptz,
  p_to           timestamptz default now()
)
returns table (
  feature          text,
  call_count       bigint,
  tokens_total     bigint,
  cost_usd_total   numeric,
  error_count      bigint,
  avg_latency_ms   numeric
) language sql stable as $$
  select
    feature,
    count(*)                    as call_count,
    coalesce(sum(l.tokens_total), 0)::bigint   as tokens_total,
    coalesce(sum(l.cost_usd), 0)               as cost_usd_total,
    count(*) filter (where l.was_error) as error_count,
    avg(l.latency_ms)             as avg_latency_ms
  from public.ai_usage_logs l
  where l.workspace_id = p_workspace_id
    and l.created_at between p_from and p_to
  group by l.feature
  order by tokens_total desc;
$$;

create or replace function public.get_ai_daily_trend(
  p_workspace_id uuid,
  p_days         integer default 30
)
returns table (
  day            date,
  tokens_total   bigint,
  cost_usd       numeric,
  call_count     bigint
) language sql stable as $$
  select
    date_trunc('day', l.created_at)::date as day,
    coalesce(sum(l.tokens_total), 0)::bigint,
    coalesce(sum(l.cost_usd), 0),
    count(*)
  from public.ai_usage_logs l
  where l.workspace_id = p_workspace_id
    and l.created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;

-- Seed ai_settings for existing workspaces
insert into public.ai_settings (workspace_id)
select id from workspaces
on conflict (workspace_id) do nothing;
