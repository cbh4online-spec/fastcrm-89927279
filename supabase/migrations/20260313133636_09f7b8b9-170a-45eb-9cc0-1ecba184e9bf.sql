
-- Fix SUPA_function_search_path_mutable: Set explicit search_path on all 21 public functions

-- Security Definer functions (highest priority)
ALTER FUNCTION public.fn_companies_audit_trigger() SET search_path = public;
ALTER FUNCTION public.fn_contact_audit_trigger() SET search_path = public;
ALTER FUNCTION public.fn_notify_team_note() SET search_path = public;
ALTER FUNCTION public.get_lifecycle_metrics(uuid) SET search_path = public;
ALTER FUNCTION public.process_goods_receipt_item_v3() SET search_path = public;

-- Regular functions
ALTER FUNCTION public.fn_companies_clamp_scores() SET search_path = public;
ALTER FUNCTION public.fn_contact_validate_scores() SET search_path = public;
ALTER FUNCTION public.fn_lifecycle_auto_transition() SET search_path = public;
ALTER FUNCTION public.fn_notify_lifecycle_transition() SET search_path = public;
ALTER FUNCTION public.generate_workflow_idempotency_key(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.get_source_priority(text) SET search_path = public;
ALTER FUNCTION public.invalidate_deal_intelligence_cache() SET search_path = public;
ALTER FUNCTION public.record_product_initial_price() SET search_path = public;
ALTER FUNCTION public.record_product_price_change() SET search_path = public;
ALTER FUNCTION public.set_opportunity_won_at() SET search_path = public;
ALTER FUNCTION public.set_source_priority() SET search_path = public;
ALTER FUNCTION public.update_pipelines_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_enrollment_status() SET search_path = public;
ALTER FUNCTION public.validate_event_decision_matrix_priority() SET search_path = public;
ALTER FUNCTION public.validate_extension_audit_action() SET search_path = public;
