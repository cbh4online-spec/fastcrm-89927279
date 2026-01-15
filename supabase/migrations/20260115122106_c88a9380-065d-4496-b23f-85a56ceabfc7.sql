-- =====================================================
-- SaaS MANAGEMENT MODULE - Complete Database Setup
-- =====================================================

-- Extend workspace_usage table with more usage tracking fields
ALTER TABLE public.workspace_usage 
ADD COLUMN IF NOT EXISTS leads_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS contacts_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS companies_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS opportunities_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS templates_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS automations_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS instagram_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_calls_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used_mb numeric DEFAULT 0;

-- Create usage_events table for auditing and tracking consumption
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on usage_events
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Create policy for usage_events
CREATE POLICY "Users can view their workspace usage events"
  ON public.usage_events
  FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert usage events"
  ON public.usage_events
  FOR INSERT
  WITH CHECK (true);

-- Create billing_events table for tracking billing-related events
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  data JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Create policies for billing_events
CREATE POLICY "Admins can view billing events"
  ON public.billing_events
  FOR SELECT
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Create usage_alerts table for tracking warnings sent
CREATE TABLE IF NOT EXISTS public.usage_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  threshold_percent INTEGER NOT NULL,
  current_usage INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on usage_alerts
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for usage_alerts
CREATE POLICY "Users can view their workspace alerts"
  ON public.usage_alerts
  FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update their workspace alerts"
  ON public.usage_alerts
  FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Create plan_features table for feature flags per plan
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan subscription_plan NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  limit_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan, feature_key)
);

-- Enable RLS on plan_features (public read, super admin write)
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Allow all users to read plan features
CREATE POLICY "Anyone can view plan features"
  ON public.plan_features
  FOR SELECT
  USING (true);

-- Insert default plan features
INSERT INTO public.plan_features (plan, feature_key, enabled, limit_value) VALUES
-- Free plan
('free', 'max_users', true, 1),
('free', 'max_leads', true, 50),
('free', 'max_contacts', true, 25),
('free', 'max_companies', true, 10),
('free', 'max_opportunities', true, 10),
('free', 'max_templates', true, 5),
('free', 'max_automations', true, 0),
('free', 'max_ai_calls', true, 0),
('free', 'max_emails_month', true, 50),
('free', 'max_whatsapp_month', true, 0),
('free', 'max_instagram_month', true, 0),
('free', 'inbox_enabled', false, NULL),
('free', 'automations_enabled', false, NULL),
('free', 'form_studio_enabled', true, NULL),
('free', 'templates_enabled', false, NULL),
('free', 'proposals_enabled', false, NULL),
('free', 'ai_suggestions_enabled', false, NULL),
('free', 'ai_insights_enabled', false, NULL),
('free', 'landing_pages_enabled', false, NULL),
('free', 'integrations_enabled', false, NULL),
('free', 'dashboard_customization', false, NULL),
('free', 'sidebar_customization', false, NULL),
('free', 'white_label', false, NULL),

-- Basic plan
('basic', 'max_users', true, 3),
('basic', 'max_leads', true, 500),
('basic', 'max_contacts', true, 250),
('basic', 'max_companies', true, 100),
('basic', 'max_opportunities', true, 100),
('basic', 'max_templates', true, 25),
('basic', 'max_automations', true, 5),
('basic', 'max_ai_calls', true, 0),
('basic', 'max_emails_month', true, 500),
('basic', 'max_whatsapp_month', true, 100),
('basic', 'max_instagram_month', true, 100),
('basic', 'inbox_enabled', true, NULL),
('basic', 'automations_enabled', true, NULL),
('basic', 'form_studio_enabled', true, NULL),
('basic', 'templates_enabled', true, NULL),
('basic', 'proposals_enabled', true, NULL),
('basic', 'ai_suggestions_enabled', false, NULL),
('basic', 'ai_insights_enabled', false, NULL),
('basic', 'landing_pages_enabled', true, NULL),
('basic', 'integrations_enabled', true, NULL),
('basic', 'dashboard_customization', false, NULL),
('basic', 'sidebar_customization', false, NULL),
('basic', 'white_label', false, NULL),

-- Pro plan
('pro', 'max_users', true, 10),
('pro', 'max_leads', true, 5000),
('pro', 'max_contacts', true, 2500),
('pro', 'max_companies', true, 1000),
('pro', 'max_opportunities', true, 1000),
('pro', 'max_templates', true, 100),
('pro', 'max_automations', true, 50),
('pro', 'max_ai_calls', true, 500),
('pro', 'max_emails_month', true, 5000),
('pro', 'max_whatsapp_month', true, 1000),
('pro', 'max_instagram_month', true, 1000),
('pro', 'inbox_enabled', true, NULL),
('pro', 'automations_enabled', true, NULL),
('pro', 'form_studio_enabled', true, NULL),
('pro', 'templates_enabled', true, NULL),
('pro', 'proposals_enabled', true, NULL),
('pro', 'ai_suggestions_enabled', true, NULL),
('pro', 'ai_insights_enabled', true, NULL),
('pro', 'landing_pages_enabled', true, NULL),
('pro', 'integrations_enabled', true, NULL),
('pro', 'dashboard_customization', true, NULL),
('pro', 'sidebar_customization', true, NULL),
('pro', 'white_label', false, NULL),

-- Agency plan (unlimited = -1)
('agency', 'max_users', true, -1),
('agency', 'max_leads', true, -1),
('agency', 'max_contacts', true, -1),
('agency', 'max_companies', true, -1),
('agency', 'max_opportunities', true, -1),
('agency', 'max_templates', true, -1),
('agency', 'max_automations', true, -1),
('agency', 'max_ai_calls', true, 5000),
('agency', 'max_emails_month', true, -1),
('agency', 'max_whatsapp_month', true, -1),
('agency', 'max_instagram_month', true, -1),
('agency', 'inbox_enabled', true, NULL),
('agency', 'automations_enabled', true, NULL),
('agency', 'form_studio_enabled', true, NULL),
('agency', 'templates_enabled', true, NULL),
('agency', 'proposals_enabled', true, NULL),
('agency', 'ai_suggestions_enabled', true, NULL),
('agency', 'ai_insights_enabled', true, NULL),
('agency', 'landing_pages_enabled', true, NULL),
('agency', 'integrations_enabled', true, NULL),
('agency', 'dashboard_customization', true, NULL),
('agency', 'sidebar_customization', true, NULL),
('agency', 'white_label', true, NULL)
ON CONFLICT (plan, feature_key) DO NOTHING;

-- Add trial_ends_at to workspace_subscriptions if not exists
ALTER TABLE public.workspace_subscriptions
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Create function to get current usage counts for a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_usage_counts(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_leads_count INTEGER;
  v_contacts_count INTEGER;
  v_companies_count INTEGER;
  v_opportunities_count INTEGER;
  v_templates_count INTEGER;
  v_automations_count INTEGER;
  v_members_count INTEGER;
BEGIN
  -- Count each entity type
  SELECT COUNT(*) INTO v_leads_count FROM public.leads WHERE workspace_id = p_workspace_id;
  SELECT COUNT(*) INTO v_contacts_count FROM public.contacts WHERE workspace_id = p_workspace_id;
  SELECT COUNT(*) INTO v_companies_count FROM public.companies WHERE workspace_id = p_workspace_id;
  SELECT COUNT(*) INTO v_opportunities_count FROM public.opportunities WHERE workspace_id = p_workspace_id;
  SELECT COUNT(*) INTO v_templates_count FROM public.templates WHERE workspace_id = p_workspace_id;
  SELECT COUNT(*) INTO v_automations_count FROM public.automation_rules WHERE workspace_id = p_workspace_id AND is_active = true;
  SELECT COUNT(*) INTO v_members_count FROM public.workspace_members WHERE workspace_id = p_workspace_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'leads_count', v_leads_count,
    'contacts_count', v_contacts_count,
    'companies_count', v_companies_count,
    'opportunities_count', v_opportunities_count,
    'templates_count', v_templates_count,
    'automations_count', v_automations_count,
    'members_count', v_members_count
  );
  
  RETURN v_result;
END;
$$;

-- Create function to check if a workspace can create a new entity
CREATE OR REPLACE FUNCTION public.check_workspace_quota(
  p_workspace_id UUID,
  p_resource_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan subscription_plan;
  v_limit INTEGER;
  v_current_count INTEGER;
  v_feature_key TEXT;
BEGIN
  -- Get workspace plan
  SELECT COALESCE(plan, 'free') INTO v_plan 
  FROM public.workspace_subscriptions 
  WHERE workspace_id = p_workspace_id;
  
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;
  
  -- Map resource type to feature key
  v_feature_key := 'max_' || p_resource_type;
  
  -- Get limit for this plan
  SELECT limit_value INTO v_limit
  FROM public.plan_features
  WHERE plan = v_plan AND feature_key = v_feature_key;
  
  -- If no limit set or unlimited (-1), allow
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1, 'percent', 0);
  END IF;
  
  -- Get current count
  CASE p_resource_type
    WHEN 'leads' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.leads WHERE workspace_id = p_workspace_id;
    WHEN 'contacts' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.contacts WHERE workspace_id = p_workspace_id;
    WHEN 'companies' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.companies WHERE workspace_id = p_workspace_id;
    WHEN 'opportunities' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.opportunities WHERE workspace_id = p_workspace_id;
    WHEN 'templates' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.templates WHERE workspace_id = p_workspace_id;
    WHEN 'automations' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.automation_rules WHERE workspace_id = p_workspace_id AND is_active = true;
    WHEN 'users' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.workspace_members WHERE workspace_id = p_workspace_id;
    ELSE
      v_current_count := 0;
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', v_current_count < v_limit,
    'current', v_current_count,
    'limit', v_limit,
    'percent', CASE WHEN v_limit > 0 THEN ROUND((v_current_count::numeric / v_limit) * 100) ELSE 0 END
  );
END;
$$;

-- Create function to check if a feature is enabled for a workspace
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_workspace_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan subscription_plan;
  v_enabled BOOLEAN;
BEGIN
  -- Get workspace plan
  SELECT COALESCE(plan, 'free') INTO v_plan 
  FROM public.workspace_subscriptions 
  WHERE workspace_id = p_workspace_id;
  
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;
  
  -- Check if feature is enabled for this plan
  SELECT enabled INTO v_enabled
  FROM public.plan_features
  WHERE plan = v_plan AND feature_key = p_feature_key;
  
  RETURN COALESCE(v_enabled, false);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_id ON public.usage_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_workspace_id ON public.billing_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_workspace_id ON public.usage_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON public.plan_features(plan);

-- Enable realtime for usage alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_alerts;