-- Create subscription_plans enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'agency');

-- Create workspace_subscriptions table
CREATE TABLE public.workspace_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_workspace_subscription UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workspace members can view subscription"
ON public.workspace_subscriptions
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Only workspace owners can manage subscription"
ON public.workspace_subscriptions
FOR ALL
USING (public.has_workspace_role(auth.uid(), workspace_id, 'owner'));

-- Create usage_limits table to track usage per workspace
CREATE TABLE public.workspace_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  ai_suggestions_used INTEGER DEFAULT 0,
  ai_insights_used INTEGER DEFAULT 0,
  automations_executed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_workspace_period UNIQUE(workspace_id, period_start)
);

-- Enable RLS
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workspace members can view usage"
ON public.workspace_usage
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can manage usage"
ON public.workspace_usage
FOR ALL
USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_workspace_subscriptions_updated_at
BEFORE UPDATE ON public.workspace_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_usage_updated_at
BEFORE UPDATE ON public.workspace_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get plan limits
CREATE OR REPLACE FUNCTION public.get_plan_limits(p_plan subscription_plan)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  CASE p_plan
    WHEN 'free' THEN
      RETURN json_build_object(
        'max_users', 1,
        'max_workspaces', 1,
        'dashboard_customization', false,
        'sidebar_customization', false,
        'user_layout_overrides', false,
        'ai_suggestions', false,
        'ai_insights', false,
        'automation_custom_fields', false,
        'max_automations', 0,
        'monthly_ai_calls', 0,
        'templates', false,
        'white_label', false
      );
    WHEN 'basic' THEN
      RETURN json_build_object(
        'max_users', 3,
        'max_workspaces', 1,
        'dashboard_customization', false,
        'sidebar_customization', false,
        'user_layout_overrides', false,
        'ai_suggestions', false,
        'ai_insights', false,
        'automation_custom_fields', false,
        'max_automations', 5,
        'monthly_ai_calls', 0,
        'templates', false,
        'white_label', false
      );
    WHEN 'pro' THEN
      RETURN json_build_object(
        'max_users', 10,
        'max_workspaces', 1,
        'dashboard_customization', true,
        'sidebar_customization', true,
        'user_layout_overrides', true,
        'ai_suggestions', true,
        'ai_insights', true,
        'automation_custom_fields', true,
        'max_automations', 50,
        'monthly_ai_calls', 500,
        'templates', false,
        'white_label', false
      );
    WHEN 'agency' THEN
      RETURN json_build_object(
        'max_users', -1,
        'max_workspaces', -1,
        'dashboard_customization', true,
        'sidebar_customization', true,
        'user_layout_overrides', true,
        'ai_suggestions', true,
        'ai_insights', true,
        'automation_custom_fields', true,
        'max_automations', -1,
        'monthly_ai_calls', 5000,
        'templates', true,
        'white_label', true
      );
  END CASE;
END;
$$;