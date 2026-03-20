
-- Sequence for human-readable ticket numbers
create sequence if not exists bug_report_ticket_seq start 1000;

-- Main reports table
create table if not exists bug_reports (
  id               uuid primary key default gen_random_uuid(),
  ticket_number    text not null unique
                   default 'FT-' || nextval('bug_report_ticket_seq'),
  workspace_id     uuid references workspaces(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  user_email       text,
  user_name        text,

  title            text not null,
  description      text not null,
  category         text not null,
  priority         text not null default 'normal',

  route            text,
  browser_name     text,
  browser_version  text,
  os_name          text,
  os_version       text,
  screen_width     int,
  screen_height    int,
  viewport_width   int,
  viewport_height  int,
  user_agent       text,
  app_version      text,

  screenshot_url   text,
  attachment_url   text,
  attachment_name  text,
  attachment_size  int,

  status           text not null default 'open',
  admin_notes      text,
  resolved_at      timestamptz,
  resolved_by      uuid references auth.users(id) on delete set null,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_bug_reports_workspace
  on bug_reports (workspace_id, created_at desc);
create index if not exists idx_bug_reports_status
  on bug_reports (status, created_at desc);
create index if not exists idx_bug_reports_user
  on bug_reports (user_id, created_at desc);

-- Auto-update updated_at
create or replace function update_bug_reports_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bug_reports_updated_at
  before update on bug_reports
  for each row execute function update_bug_reports_updated_at();

-- RLS
alter table bug_reports enable row level security;

create policy "authenticated users can create bug reports"
  on bug_reports for insert
  with check (auth.role() = 'authenticated');

create policy "users can read own bug reports"
  on bug_reports for select
  using (user_id = auth.uid());

create policy "super admin full access bug reports"
  on bug_reports
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- Storage bucket for screenshots and attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bug-report-assets',
  'bug-report-assets',
  false,
  5242880,
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
on conflict (id) do nothing;

-- Storage RLS
create policy "users can upload bug report assets"
  on storage.objects for insert
  with check (
    bucket_id = 'bug-report-assets' and
    auth.role() = 'authenticated'
  );

create policy "users can read bug report assets"
  on storage.objects for select
  using (
    bucket_id = 'bug-report-assets' and
    auth.role() = 'authenticated'
  );
