CREATE OR REPLACE FUNCTION public.increment_campaign_stat(p_campaign_id uuid, p_field text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  CASE p_field
    WHEN 'delivered_count' THEN UPDATE public.marketing_campaigns SET delivered_count = COALESCE(delivered_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    WHEN 'opened_count' THEN UPDATE public.marketing_campaigns SET opened_count = COALESCE(opened_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    WHEN 'clicked_count' THEN UPDATE public.marketing_campaigns SET clicked_count = COALESCE(clicked_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    WHEN 'bounced_count' THEN UPDATE public.marketing_campaigns SET bounced_count = COALESCE(bounced_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    WHEN 'complained_count' THEN UPDATE public.marketing_campaigns SET complained_count = COALESCE(complained_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    WHEN 'unsubscribed_count' THEN UPDATE public.marketing_campaigns SET unsubscribed_count = COALESCE(unsubscribed_count,0)+1, updated_at = now() WHERE id = p_campaign_id;
    ELSE RAISE EXCEPTION 'Invalid campaign stat field';
  END CASE;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.check_workspace_quota(p_workspace_id uuid, p_resource_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_plan_id UUID; v_limit INTEGER; v_current INTEGER;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Permission denied: not a workspace member';
  END IF;
  IF p_resource_type NOT IN ('leads','contacts','companies','opportunities') THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0, 'reason', 'Resource not metered');
  END IF;
  SELECT ws.plan_id INTO v_plan_id FROM public.workspace_subscriptions ws
  WHERE ws.workspace_id = p_workspace_id AND ws.status = 'active' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0, 'reason', 'No active plan - defaults allowed');
  END IF;
  SELECT (limits->>p_resource_type)::INTEGER INTO v_limit FROM public.subscription_plans WHERE id = v_plan_id;
  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0);
  END IF;
  CASE p_resource_type
    WHEN 'leads' THEN SELECT COUNT(*) INTO v_current FROM public.leads WHERE workspace_id = p_workspace_id;
    WHEN 'contacts' THEN SELECT COUNT(*) INTO v_current FROM public.contacts WHERE workspace_id = p_workspace_id;
    WHEN 'companies' THEN SELECT COUNT(*) INTO v_current FROM public.companies WHERE workspace_id = p_workspace_id;
    WHEN 'opportunities' THEN SELECT COUNT(*) INTO v_current FROM public.opportunities WHERE workspace_id = p_workspace_id;
  END CASE;
  RETURN jsonb_build_object('allowed', v_current < v_limit, 'limit', v_limit, 'current', v_current);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.check_workspace_quota(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_workspace_quota(uuid, text) TO authenticated, service_role;