
-- Add missing columns to marketing_campaigns
alter table marketing_campaigns
  add column if not exists send_paused boolean not null default false,
  add column if not exists queue_total int not null default 0,
  add column if not exists queue_sent int not null default 0,
  add column if not exists queue_failed int not null default 0;

-- Add validation columns to marketing_recipients
alter table marketing_recipients
  add column if not exists validation_status text default 'unchecked',
  add column if not exists validation_reason text,
  add column if not exists validated_at timestamptz;

-- Helper functions for atomic counters
create or replace function increment_campaign_queue_sent(p_campaign_id uuid)
returns void language sql security definer set search_path = public as $$
  update marketing_campaigns
  set queue_sent = queue_sent + 1
  where id = p_campaign_id;
$$;

create or replace function increment_campaign_queue_failed(p_campaign_id uuid)
returns void language sql security definer set search_path = public as $$
  update marketing_campaigns
  set queue_failed = queue_failed + 1
  where id = p_campaign_id;
$$;
