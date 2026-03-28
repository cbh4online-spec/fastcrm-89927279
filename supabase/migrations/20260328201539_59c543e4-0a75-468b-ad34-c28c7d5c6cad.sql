
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_cron text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_events text[] DEFAULT '{}';
