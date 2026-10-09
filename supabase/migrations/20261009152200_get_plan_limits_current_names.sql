-- Preserve every legacy branch of get_plan_limits and add the three
-- current Stripe/UI plan names. This migration runs after the enum
-- extension has committed in 20261009152000.
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
    WHEN 'starter' THEN
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
        'multi_conditions', false,
        'multi_actions', false,
        'monthly_ai_calls', 0,
        'templates', false,
        'white_label', false,
        'multi_pipeline', false,
        'marketplace_access', false,
        'api_access', false,
        'advanced_roles', false,
        'priority_support', false
      );
    WHEN 'growth' THEN
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
        'multi_conditions', true,
        'multi_actions', false,
        'monthly_ai_calls', 500,
        'templates', false,
        'white_label', false,
        'multi_pipeline', true,
        'marketplace_access', true,
        'api_access', false,
        'advanced_roles', false,
        'priority_support', false
      );
    WHEN 'scale' THEN
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
        'multi_conditions', true,
        'multi_actions', true,
        'monthly_ai_calls', 5000,
        'templates', true,
        'white_label', true,
        'multi_pipeline', true,
        'marketplace_access', true,
        'api_access', true,
        'advanced_roles', true,
        'priority_support', true
      );
  END CASE;
END;
$$;
