-- Notification preferences per user/workspace
CREATE TABLE IF NOT EXISTS public.leadchef_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  remind_next_actions boolean NOT NULL DEFAULT true,
  remind_window_minutes integer NOT NULL DEFAULT 30,
  alert_cold_leads boolean NOT NULL DEFAULT true,
  cold_lead_inactive_days integer NOT NULL DEFAULT 7,
  quiet_hours_start integer,
  quiet_hours_end integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.leadchef_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_notif_prefs_select_own"
  ON public.leadchef_notification_prefs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "leadchef_notif_prefs_insert_own"
  ON public.leadchef_notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leadchef_notif_prefs_update_own"
  ON public.leadchef_notification_prefs FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "leadchef_notif_prefs_delete_own"
  ON public.leadchef_notification_prefs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_leadchef_notif_prefs_updated_at
  BEFORE UPDATE ON public.leadchef_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add dedupe key column on push queue to avoid duplicate enqueues from scheduler
ALTER TABLE public.leadchef_push_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leadchef_push_queue_dedupe
  ON public.leadchef_push_queue (dedupe_key)
  WHERE dedupe_key IS NOT NULL;
