ALTER TABLE public.workspace_stripe_config
  ADD COLUMN IF NOT EXISTS store_webhook_secret_encrypted text
  CHECK (store_webhook_secret_encrypted IS NULL OR store_webhook_secret_encrypted ~ '^whsec_[A-Za-z0-9]{10,200}$');

CREATE TABLE IF NOT EXISTS public.store_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  store_order_id uuid,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, stripe_event_id)
);
ALTER TABLE public.store_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.store_webhook_events TO authenticated;
GRANT ALL ON public.store_webhook_events TO service_role;
CREATE POLICY "Owners/admins view store webhook events" ON public.store_webhook_events
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = store_webhook_events.workspace_id AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')));
CREATE INDEX IF NOT EXISTS idx_store_webhook_events_order ON public.store_webhook_events(store_order_id);