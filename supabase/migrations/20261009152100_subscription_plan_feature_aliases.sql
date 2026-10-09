-- Keep the legacy feature catalogue usable for the current plan names.
-- Existing custom rows always win. These source plans match the current
-- check-subscription limits for users, automations and monthly AI calls:
-- Starter 3/5/0, Growth 10/50/500, Scale unlimited/unlimited/5000.
-- Legacy plan rows and subscriptions remain unchanged.
-- First write the flags with a clear equivalent in PLAN_LIMITS. Automation
-- access follows max_automations > 0. Never overwrite a current-plan row
-- that an administrator may have customized.
INSERT INTO public.plan_features (plan, feature_key, enabled, limit_value)
SELECT flags.plan::public.subscription_plan, flags.feature_key, flags.enabled, NULL
FROM (VALUES
  ('starter', 'dashboard_customization', false),
  ('starter', 'sidebar_customization', false),
  ('starter', 'white_label', false),
  ('starter', 'ai_suggestions_enabled', false),
  ('starter', 'ai_insights_enabled', false),
  ('starter', 'automations_enabled', true),
  ('growth', 'dashboard_customization', true),
  ('growth', 'sidebar_customization', true),
  ('growth', 'white_label', false),
  ('growth', 'ai_suggestions_enabled', true),
  ('growth', 'ai_insights_enabled', true),
  ('growth', 'automations_enabled', true),
  ('scale', 'dashboard_customization', true),
  ('scale', 'sidebar_customization', true),
  ('scale', 'white_label', true),
  ('scale', 'ai_suggestions_enabled', true),
  ('scale', 'ai_insights_enabled', true),
  ('scale', 'automations_enabled', true)
) AS flags(plan, feature_key, enabled)
WHERE true
ON CONFLICT (plan, feature_key) DO NOTHING;

-- Templates are a separate legacy module flag for reusable messages. It
-- cannot be equated safely with PLAN_LIMITS.templates: the current plan
-- limits and module upgrade copy disagree about its entitlement. Preserve
-- the legacy catalogue for that flag until the product rule is decided.
INSERT INTO public.plan_features (plan, feature_key, enabled, limit_value)
SELECT aliases.current_name::public.subscription_plan,
       features.feature_key,
       features.enabled,
       features.limit_value
FROM public.plan_features AS features
JOIN (
  VALUES
    ('basic'::public.subscription_plan, 'starter'),
    ('pro'::public.subscription_plan, 'growth'),
    ('agency'::public.subscription_plan, 'scale')
) AS aliases(legacy_name, current_name)
  ON features.plan = aliases.legacy_name
WHERE true
ON CONFLICT (plan, feature_key) DO NOTHING;
