create table public.whatsapp_recurring_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  created_by uuid not null,
  name text not null,
  description text,
  target_type text not null default 'segment' check (target_type in ('segment','tags','all')),
  segment_id uuid,
  target_tags text[] not null default '{}',
  template_id uuid,
  body text not null,
  media_url text,
  media_mime_type text,
  cta_url text,
  cta_label text,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','monthly')),
  weekly_days int[] not null default '{}',
  monthly_day int check (monthly_day between 1 and 31),
  run_time time not null default '09:00',
  timezone text not null default 'Europe/Lisbon',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_runs int,
  run_count int not null default 0,
  jitter_minutes int not null default 0 check (jitter_minutes between 0 and 180),
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_dispatch_count int not null default 0,
  last_error text,
  status text not null default 'active' check (status in ('active','paused','completed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_wa_recurring_workspace on public.whatsapp_recurring_campaigns(workspace_id, status);
create index idx_wa_recurring_due on public.whatsapp_recurring_campaigns(status, next_run_at) where status = 'active';

alter table public.whatsapp_recurring_campaigns enable row level security;

create policy "wa_recurring_select_members"
  on public.whatsapp_recurring_campaigns for select
  using (is_workspace_member(auth.uid(), workspace_id));

create policy "wa_recurring_insert_members"
  on public.whatsapp_recurring_campaigns for insert
  with check (is_workspace_member(auth.uid(), workspace_id) and created_by = auth.uid());

create policy "wa_recurring_update_members"
  on public.whatsapp_recurring_campaigns for update
  using (is_workspace_member(auth.uid(), workspace_id));

create policy "wa_recurring_delete_members"
  on public.whatsapp_recurring_campaigns for delete
  using (is_workspace_member(auth.uid(), workspace_id));

create trigger trg_wa_recurring_updated_at
  before update on public.whatsapp_recurring_campaigns
  for each row execute function public.update_updated_at_column();