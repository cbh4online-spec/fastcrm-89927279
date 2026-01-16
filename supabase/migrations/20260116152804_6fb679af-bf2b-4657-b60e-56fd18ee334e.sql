-- =============================================
-- MARKETPLACE MODULES SYSTEM
-- =============================================

-- Table: marketplace_modules (catalog of available modules)
CREATE TABLE public.marketplace_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Package',
  cover_image TEXT,
  
  -- Business info (shown to customer)
  target_audience TEXT,
  expected_results JSONB DEFAULT '[]'::jsonb,
  use_cases JSONB DEFAULT '[]'::jsonb,
  
  -- Internal (hidden from customer)
  internal_type TEXT NOT NULL DEFAULT 'native_feature', -- connector, ai_service, embedded_app, native_feature
  status TEXT NOT NULL DEFAULT 'active',
  version TEXT NOT NULL DEFAULT '1.0.0',
  
  -- Embedded app config
  embedded_config JSONB,
  
  -- Permissions
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Pricing
  pricing JSONB NOT NULL DEFAULT '{"type": "free", "base_price": 0, "currency": "EUR"}'::jsonb,
  
  -- Metadata
  publisher TEXT NOT NULL DEFAULT 'FastCRM',
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  rating DECIMAL(3,2),
  reviews_count INTEGER DEFAULT 0,
  installs_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Table: workspace_modules (installed modules per workspace)
CREATE TABLE public.workspace_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'active', -- active, trial, suspended, canceled
  
  -- Subscription
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscribed_by UUID NOT NULL,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Custom settings per workspace
  settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, module_id)
);

-- Table: module_usage (usage tracking per workspace module)
CREATE TABLE public.module_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics
  total_calls INTEGER DEFAULT 0,
  total_records_created INTEGER DEFAULT 0,
  total_records_updated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  
  -- Impact tracking
  leads_created INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  opportunities_created INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, module_id, period_start)
);

-- Table: module_action_logs (audit log for module actions)
CREATE TABLE public.module_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  user_id UUID,
  
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  
  details JSONB,
  credits_consumed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_action_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_modules (public read for active modules)
CREATE POLICY "Anyone can view active modules"
  ON public.marketplace_modules FOR SELECT
  USING (status = 'active');

-- RLS Policies for workspace_modules
CREATE POLICY "Users can view workspace modules"
  ON public.workspace_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_modules.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workspace modules"
  ON public.workspace_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_modules.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for module_usage
CREATE POLICY "Users can view module usage"
  ON public.module_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = module_usage.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert module usage"
  ON public.module_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update module usage"
  ON public.module_usage FOR UPDATE
  USING (true);

-- RLS Policies for module_action_logs
CREATE POLICY "Users can view module action logs"
  ON public.module_action_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = module_action_logs.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert action logs"
  ON public.module_action_logs FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_marketplace_modules_category ON public.marketplace_modules(category);
CREATE INDEX idx_marketplace_modules_status ON public.marketplace_modules(status);
CREATE INDEX idx_marketplace_modules_featured ON public.marketplace_modules(is_featured) WHERE is_featured = true;
CREATE INDEX idx_workspace_modules_workspace ON public.workspace_modules(workspace_id);
CREATE INDEX idx_workspace_modules_status ON public.workspace_modules(status);
CREATE INDEX idx_module_usage_workspace_period ON public.module_usage(workspace_id, period_start);
CREATE INDEX idx_module_action_logs_workspace ON public.module_action_logs(workspace_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_modules_updated_at
  BEFORE UPDATE ON public.marketplace_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_modules_updated_at
  BEFORE UPDATE ON public.workspace_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_usage_updated_at
  BEFORE UPDATE ON public.module_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();