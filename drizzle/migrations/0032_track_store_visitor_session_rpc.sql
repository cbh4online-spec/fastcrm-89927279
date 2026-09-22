-- Upsert de sessões de visitantes da loja via RPC SECURITY DEFINER.
-- Evita conceder leitura de sessões ao papel anónimo (exigida pelo upsert via Data API).

CREATE OR REPLACE FUNCTION public.track_store_visitor_session(
  p_workspace_id uuid,
  p_session_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_workspace_id IS NULL OR p_session_id IS NULL OR length(p_session_id) = 0 THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;
  IF length(p_session_id) > 120 THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;

  INSERT INTO public.store_visitor_sessions AS s (
    workspace_id, session_id, first_page, referrer,
    utm_source, utm_medium, utm_campaign, device_type,
    pages_viewed, products_viewed, time_on_site_seconds, last_activity_at,
    scroll_depth_max, exit_page, pages_history,
    consent_analytics, consent_marketing, gdpr_visitor_id,
    cart_items, cart_subtotal, cart_updated_at, visitor_score
  )
  VALUES (
    p_workspace_id,
    p_session_id,
    nullif(p_payload->>'first_page', ''),
    nullif(p_payload->>'referrer', ''),
    nullif(p_payload->>'utm_source', ''),
    nullif(p_payload->>'utm_medium', ''),
    nullif(p_payload->>'utm_campaign', ''),
    nullif(p_payload->>'device_type', ''),
    coalesce((p_payload->>'pages_viewed')::int, 1),
    coalesce(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(p_payload->'products_viewed') = 'array'
             THEN p_payload->'products_viewed' ELSE '[]'::jsonb END) AS t(x)),
      '{}'::text[]
    ),
    coalesce((p_payload->>'time_on_site_seconds')::int, 0),
    coalesce((p_payload->>'last_activity_at')::timestamptz, now()),
    coalesce((p_payload->>'scroll_depth_max')::smallint, 0),
    nullif(p_payload->>'exit_page', ''),
    coalesce(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(p_payload->'pages_history') = 'array'
             THEN p_payload->'pages_history' ELSE '[]'::jsonb END) AS t(x)),
      '{}'::text[]
    ),
    coalesce((p_payload->>'consent_analytics')::boolean, false),
    coalesce((p_payload->>'consent_marketing')::boolean, false),
    nullif(p_payload->>'gdpr_visitor_id', ''),
    CASE WHEN jsonb_typeof(p_payload->'cart_items') = 'array' THEN p_payload->'cart_items' ELSE NULL END,
    nullif(p_payload->>'cart_subtotal', '')::numeric,
    nullif(p_payload->>'cart_updated_at', '')::timestamptz,
    nullif(p_payload->>'visitor_score', '')::smallint
  )
  ON CONFLICT (workspace_id, session_id) DO UPDATE SET
    pages_viewed = greatest(coalesce(s.pages_viewed, 0), excluded.pages_viewed),
    products_viewed = excluded.products_viewed,
    time_on_site_seconds = greatest(coalesce(s.time_on_site_seconds, 0), excluded.time_on_site_seconds),
    last_activity_at = excluded.last_activity_at,
    scroll_depth_max = greatest(coalesce(s.scroll_depth_max, 0::smallint), excluded.scroll_depth_max),
    exit_page = coalesce(excluded.exit_page, s.exit_page),
    pages_history = excluded.pages_history,
    consent_analytics = excluded.consent_analytics,
    consent_marketing = excluded.consent_marketing,
    gdpr_visitor_id = coalesce(excluded.gdpr_visitor_id, s.gdpr_visitor_id),
    cart_items = coalesce(excluded.cart_items, s.cart_items),
    cart_subtotal = coalesce(excluded.cart_subtotal, s.cart_subtotal),
    cart_updated_at = coalesce(excluded.cart_updated_at, s.cart_updated_at),
    visitor_score = coalesce(excluded.visitor_score, s.visitor_score),
    first_page = coalesce(s.first_page, excluded.first_page),
    referrer = coalesce(s.referrer, excluded.referrer),
    utm_source = coalesce(s.utm_source, excluded.utm_source),
    utm_medium = coalesce(s.utm_medium, excluded.utm_medium),
    utm_campaign = coalesce(s.utm_campaign, excluded.utm_campaign),
    device_type = coalesce(s.device_type, excluded.device_type);
END;
$$;

REVOKE ALL ON FUNCTION public.track_store_visitor_session(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_store_visitor_session(uuid, text, jsonb) TO anon, authenticated, service_role;

-- A leitura das sessões permanece restrita aos membros do workspace.
REVOKE SELECT, INSERT ON public.store_visitor_sessions FROM anon;
DROP POLICY IF EXISTS "storefront_insert_visitor_session" ON public.store_visitor_sessions;
