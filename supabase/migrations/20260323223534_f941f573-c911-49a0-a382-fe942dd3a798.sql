
-- IMO AI: Market Intelligence & Growth Insights tables

create table if not exists public.imo_market_insights (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  period_start          date not null,
  period_end            date not null,
  dominant_sectors      text[] default '{}',
  sector_distribution   jsonb default '{}',
  market_signals        jsonb default '[]',
  competitive_signals   jsonb default '[]',
  demand_calendar       jsonb default '{}',
  peak_months           text[] default '{}',
  low_months            text[] default '{}',
  untapped_segments     jsonb default '[]',
  market_summary        text,
  key_findings          text[] default '{}',
  tokens_used           integer,
  generated_at          timestamptz not null default now(),
  expires_at            timestamptz not null default (now() + interval '12 hours'),
  is_stale              boolean not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists idx_imo_market_insights_workspace
  on imo_market_insights(workspace_id, generated_at desc);

create index if not exists idx_imo_market_insights_active
  on imo_market_insights(workspace_id, is_stale, expires_at);

alter table imo_market_insights enable row level security;

create policy "workspace_isolation_market" on imo_market_insights
  for all using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  ));

-- Growth Insights table
create table if not exists public.imo_growth_insights (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  opportunities         jsonb default '[]',
  channel_analysis      jsonb default '[]',
  segment_analysis      jsonb default '[]',
  reactivation_targets  jsonb default '[]',
  quick_wins            jsonb default '[]',
  roadmap_90d           jsonb default '[]',
  growth_score          integer,
  growth_score_delta    integer,
  growth_summary        text,
  top_priority          text,
  tokens_used           integer,
  generated_at          timestamptz not null default now(),
  expires_at            timestamptz not null default (now() + interval '12 hours'),
  is_stale              boolean not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists idx_imo_growth_insights_workspace
  on imo_growth_insights(workspace_id, generated_at desc);

create index if not exists idx_imo_growth_insights_active
  on imo_growth_insights(workspace_id, is_stale, expires_at);

alter table imo_growth_insights enable row level security;

create policy "workspace_isolation_growth" on imo_growth_insights
  for all using (workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  ));

-- Cache invalidation function
create or replace function public.invalidate_imo_reports()
returns trigger language plpgsql as $$
begin
  update imo_market_insights set is_stale = true
  where workspace_id = NEW.workspace_id and is_stale = false;

  update imo_growth_insights set is_stale = true
  where workspace_id = NEW.workspace_id and is_stale = false;

  return NEW;
end;
$$;

-- Invalidate on won/lost opportunities
create trigger trg_invalidate_imo_on_opportunity_close
  after update on opportunities
  for each row
  when (
    OLD.status is distinct from NEW.status
    and NEW.status in ('won', 'lost')
  )
  execute function public.invalidate_imo_reports();
