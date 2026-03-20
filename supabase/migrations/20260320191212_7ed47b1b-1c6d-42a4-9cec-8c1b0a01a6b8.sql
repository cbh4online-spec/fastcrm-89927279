
-- supplier_feeds: stores feed configuration per supplier
create table if not exists supplier_feeds (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  supplier_id         uuid references suppliers(id) on delete set null,
  feed_name           text not null,
  feed_url            text not null,
  feed_type           text not null default 'csv' check (feed_type in ('csv', 'json', 'xml')),
  auto_sync_enabled   boolean not null default false,
  sync_interval_hours int not null default 24,
  column_mapping      jsonb not null default '{}',
  last_sync_at        timestamptz,
  last_sync_status    text check (last_sync_status in ('running', 'completed', 'failed')),
  last_sync_rows      int default 0,
  auth_config         jsonb default '{}',
  csv_delimiter       text not null default ';',
  csv_encoding        text not null default 'utf-8',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_supplier_feeds_workspace on supplier_feeds(workspace_id);
create index if not exists idx_supplier_feeds_supplier on supplier_feeds(supplier_id);

alter table supplier_feeds enable row level security;

create policy "workspace members can manage feeds"
  on supplier_feeds for all
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "service role bypass feeds"
  on supplier_feeds
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- supplier_feed_logs: sync history
create table if not exists supplier_feed_logs (
  id              uuid primary key default gen_random_uuid(),
  feed_id         uuid not null references supplier_feeds(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  status          text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_rows      int not null default 0,
  created_count   int not null default 0,
  updated_count   int not null default 0,
  skipped_count   int not null default 0,
  error_count     int not null default 0,
  error_message   text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_feed_logs_feed on supplier_feed_logs(feed_id);
create index if not exists idx_feed_logs_workspace on supplier_feed_logs(workspace_id);

alter table supplier_feed_logs enable row level security;

create policy "workspace members can read feed logs"
  on supplier_feed_logs for select
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "service role bypass feed logs"
  on supplier_feed_logs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
