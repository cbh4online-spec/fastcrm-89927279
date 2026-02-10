
-- Price & Stock alerts table
CREATE TABLE public.store_product_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock')),
  target_price numeric DEFAULT NULL, -- for price drop alerts: notify when price drops to/below this
  is_active boolean NOT NULL DEFAULT true,
  notified_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_product_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (public store)
CREATE POLICY "Anyone can create product alerts"
  ON public.store_product_alerts
  FOR INSERT
  WITH CHECK (true);

-- Users can see their own alerts by email (handled in code)
CREATE POLICY "Anyone can read product alerts"
  ON public.store_product_alerts
  FOR SELECT
  USING (true);

-- Workspace members can manage alerts
CREATE POLICY "Workspace members can update alerts"
  ON public.store_product_alerts
  FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can delete alerts"
  ON public.store_product_alerts
  FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Unique constraint: one alert per email+product+type
CREATE UNIQUE INDEX idx_store_alerts_unique ON public.store_product_alerts(product_id, email, alert_type) WHERE is_active = true;

-- Index for processing
CREATE INDEX idx_store_alerts_active ON public.store_product_alerts(workspace_id, alert_type, is_active) WHERE is_active = true;
