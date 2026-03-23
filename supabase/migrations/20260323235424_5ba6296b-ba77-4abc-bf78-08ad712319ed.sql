
-- Function to reset monthly AI budgets (called by Trigger.dev monthly-budget-reset job)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_settings
  SET 
    current_month_tokens = 0,
    current_month_cost_usd = 0,
    budget_alert_sent = false,
    budget_reset_date = now()::text,
    updated_at = now()
  WHERE current_month_tokens > 0 OR current_month_cost_usd > 0;
END;
$$;
