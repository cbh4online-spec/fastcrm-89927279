
-- vertical_template_settings
CREATE TABLE public.vertical_template_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.vertical_templates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  domain TEXT,
  path TEXT,
  favicon_url TEXT,
  head_tracking_code TEXT,
  body_tracking_code TEXT,
  chat_widget TEXT NOT NULL DEFAULT 'none',
  payment_mode_live BOOLEAN NOT NULL DEFAULT false,
  require_credit_card BOOLEAN NOT NULL DEFAULT false,
  image_optimization BOOLEAN NOT NULL DEFAULT true,
  optimize_javascript BOOLEAN NOT NULL DEFAULT true,
  gdpr_compliant_fonts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id)
);

ALTER TABLE public.vertical_template_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace template settings"
  ON public.vertical_template_settings FOR ALL
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- vertical_tracking_events
CREATE TABLE public.vertical_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.vertical_templates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pixel_id TEXT NOT NULL,
  access_token TEXT,
  tracking_level TEXT NOT NULL DEFAULT 'standard',
  events_tracked TEXT[] NOT NULL DEFAULT ARRAY['PageView', 'Lead', 'Purchase'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vertical_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace tracking events"
  ON public.vertical_tracking_events FOR ALL
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- vertical_template_sales
CREATE TABLE public.vertical_template_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.vertical_templates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  product_name TEXT,
  transaction_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vertical_template_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace template sales"
  ON public.vertical_template_sales FOR ALL
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- Trigger for updated_at on settings
CREATE TRIGGER update_vertical_template_settings_updated_at
  BEFORE UPDATE ON public.vertical_template_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
