
create table if not exists public.gsc_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('sitemap_error','sitemap_warning','sitemap_pending','url_not_indexed','canonical_mismatch','crawl_error','robots_blocked')),
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  site text not null,
  url text,
  title text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  status text not null default 'open' check (status in ('open','resolved','snoozed')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists gsc_alerts_fingerprint_unique on public.gsc_alerts(fingerprint);
create index if not exists gsc_alerts_status_idx on public.gsc_alerts(status, last_seen_at desc);
create index if not exists gsc_alerts_type_idx on public.gsc_alerts(alert_type);

alter table public.gsc_alerts enable row level security;

create policy "Super admins read gsc_alerts"
  on public.gsc_alerts for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

create policy "Super admins update gsc_alerts"
  on public.gsc_alerts for update
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy "Super admins delete gsc_alerts"
  on public.gsc_alerts for delete
  to authenticated
  using (public.is_super_admin(auth.uid()));
