-- Phase 12D: Push notifications subscriptions
CREATE TABLE IF NOT EXISTS public.leadchef_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_push_user
  ON public.leadchef_push_subscriptions (workspace_id, user_id) WHERE enabled = true;

ALTER TABLE public.leadchef_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_push_select_own"
  ON public.leadchef_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "leadchef_push_insert_own"
  ON public.leadchef_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leadchef_push_update_own"
  ON public.leadchef_push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "leadchef_push_delete_own"
  ON public.leadchef_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_leadchef_push_subscriptions_updated_at
  BEFORE UPDATE ON public.leadchef_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outbound queue (created by other edge functions / triggers; sent by dispatcher)
CREATE TABLE IF NOT EXISTS public.leadchef_push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_push_queue_pending
  ON public.leadchef_push_queue (scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.leadchef_push_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_push_queue_select_own"
  ON public.leadchef_push_queue FOR SELECT
  USING (auth.uid() = user_id);
