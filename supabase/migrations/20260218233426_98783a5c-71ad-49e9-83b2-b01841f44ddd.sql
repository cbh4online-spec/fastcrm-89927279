
-- =========================================================
-- FastCRM | AI Employee Builder - Complementary Tables
-- Skips bots (already exists), adds new tables only
-- =========================================================

-- ---------- 0) Extensions (safe) ----------
create extension if not exists "pgcrypto";

-- ---------- 1) Enums (safe idempotent) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bot_type') then
    create type public.bot_type as enum ('guided', 'prompt', 'flow');
  end if;
  if not exists (select 1 from pg_type where typname = 'bot_status') then
    create type public.bot_status as enum ('draft', 'active', 'paused', 'archived');
  end if;
end$$;

-- ---------- 2) Updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 3) New tables (bots already exists - skipped)
-- =========================================================

-- 3.2 bot_settings
create table if not exists public.bot_settings (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  workspace_id uuid not null,
  tone text null,
  greeting_message text null,
  fallback_message text null,
  handover_enabled boolean not null default false,
  handover_role text null,
  handover_user_id uuid null,
  trigger_keywords text[] null,
  capture_name boolean not null default true,
  capture_email boolean not null default true,
  capture_phone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bot_settings_workspace_id on public.bot_settings (workspace_id);

-- 3.3 bot_channels
create table if not exists public.bot_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  bot_id uuid not null references public.bots(id) on delete cascade,
  channel_type text not null,
  channel_identifier text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bot_channels_workspace on public.bot_channels (workspace_id);
create index if not exists idx_bot_channels_bot on public.bot_channels (bot_id);
create unique index if not exists uq_bot_channels_unique
  on public.bot_channels (workspace_id, channel_type, coalesce(channel_identifier, ''))
  where is_active = true;

-- 3.5 bot_analytics (recreate with new structure if different)
-- Drop old one if columns don't match, then recreate
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_analytics' AND column_name = 'total_messages_in') THEN
    ALTER TABLE public.bot_analytics ADD COLUMN IF NOT EXISTS total_messages_in bigint not null default 0;
    ALTER TABLE public.bot_analytics ADD COLUMN IF NOT EXISTS total_messages_out bigint not null default 0;
    ALTER TABLE public.bot_analytics ADD COLUMN IF NOT EXISTS total_handovers bigint not null default 0;
    ALTER TABLE public.bot_analytics ADD COLUMN IF NOT EXISTS avg_response_time_ms bigint null;
  END IF;
END $$;

-- 3.6 bot_runs
create table if not exists public.bot_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid null,
  message_id uuid null,
  status text not null default 'success',
  input_payload jsonb null,
  output_payload jsonb null,
  error_message text null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bot_runs_workspace on public.bot_runs (workspace_id);
create index if not exists idx_bot_runs_bot on public.bot_runs (bot_id);
create index if not exists idx_bot_runs_created_at on public.bot_runs (workspace_id, created_at desc);

-- =========================================================
-- 4) Triggers
-- =========================================================
drop trigger if exists trg_bot_settings_updated_at on public.bot_settings;
create trigger trg_bot_settings_updated_at
before update on public.bot_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_bot_channels_updated_at on public.bot_channels;
create trigger trg_bot_channels_updated_at
before update on public.bot_channels
for each row execute function public.set_updated_at();

-- =========================================================
-- 5) RLS
-- =========================================================
alter table public.bot_settings enable row level security;
alter table public.bot_channels enable row level security;
alter table public.bot_runs enable row level security;

-- --- bot_settings ---
drop policy if exists "bot_settings_select_member" on public.bot_settings;
create policy "bot_settings_select_member" on public.bot_settings for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_settings.workspace_id and wm.user_id = auth.uid()));

drop policy if exists "bot_settings_insert_member" on public.bot_settings;
create policy "bot_settings_insert_member" on public.bot_settings for insert
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_settings.workspace_id and wm.user_id = auth.uid()));

drop policy if exists "bot_settings_update_member" on public.bot_settings;
create policy "bot_settings_update_member" on public.bot_settings for update
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_settings.workspace_id and wm.user_id = auth.uid()))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_settings.workspace_id and wm.user_id = auth.uid()));

drop policy if exists "bot_settings_delete_member" on public.bot_settings;
create policy "bot_settings_delete_member" on public.bot_settings for delete
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_settings.workspace_id and wm.user_id = auth.uid()));

-- --- bot_channels ---
drop policy if exists "bot_channels_select_member" on public.bot_channels;
create policy "bot_channels_select_member" on public.bot_channels for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_channels.workspace_id and wm.user_id = auth.uid()));

drop policy if exists "bot_channels_write_member" on public.bot_channels;
create policy "bot_channels_write_member" on public.bot_channels for all
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_channels.workspace_id and wm.user_id = auth.uid()))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_channels.workspace_id and wm.user_id = auth.uid()));

-- --- bot_runs ---
drop policy if exists "bot_runs_select_member" on public.bot_runs;
create policy "bot_runs_select_member" on public.bot_runs for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = bot_runs.workspace_id and wm.user_id = auth.uid()));
