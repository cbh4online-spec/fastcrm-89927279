-- LeadChef performance indexes (Phase 10)
CREATE INDEX IF NOT EXISTS idx_leadchef_lead_profiles_ws_stage
  ON public.leadchef_lead_profiles (workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_leadchef_lead_profiles_ws_next_action
  ON public.leadchef_lead_profiles (workspace_id, next_action_at);
CREATE INDEX IF NOT EXISTS idx_leadchef_lead_profiles_ws_lead
  ON public.leadchef_lead_profiles (workspace_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_leadchef_referrals_ws_status
  ON public.leadchef_referrals (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leadchef_goals_ws_user_period
  ON public.leadchef_goals (workspace_id, user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_leadchef_customer_experiences_ws_lead
  ON public.leadchef_customer_experiences (workspace_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_leadchef_message_templates_ws_category
  ON public.leadchef_message_templates (workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_leadchef_automation_rules_ws_key
  ON public.leadchef_automation_rules (workspace_id, key);