-- 1. Políticas de escrita abertas: o serviço (service_role) ignora RLS, por isso basta remover.
DROP POLICY IF EXISTS "Service can update leads" ON public.booking_leads;
DROP POLICY IF EXISTS "System can manage progress" ON public.conversation_objective_progress;
DROP POLICY IF EXISTS "System can update module usage" ON public.module_usage;
DROP POLICY IF EXISTS "System can update referrals" ON public.store_referrals;

-- 2. Matriz de eventos e base de conhecimento global: escrita só para super admin.
DROP POLICY IF EXISTS "Authenticated users can manage event_decision_matrix" ON public.event_decision_matrix;
CREATE POLICY "Super admins manage event_decision_matrix" ON public.event_decision_matrix
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "authenticated users can update articles" ON public.kb_articles;
DROP POLICY IF EXISTS "authenticated users can delete articles" ON public.kb_articles;
DROP POLICY IF EXISTS "authenticated users can insert articles" ON public.kb_articles;
CREATE POLICY "Super admins write articles" ON public.kb_articles
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "authenticated users can update categories" ON public.kb_categories;
DROP POLICY IF EXISTS "authenticated users can delete categories" ON public.kb_categories;
DROP POLICY IF EXISTS "authenticated users can insert categories" ON public.kb_categories;
CREATE POLICY "Super admins write categories" ON public.kb_categories
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. Visitas anónimas: atualização só da própria linha via funções controladas.
DROP POLICY IF EXISTS "Anon can update own ebook_views by session" ON public.ebook_views;
DROP POLICY IF EXISTS "storefront_update_visitor_session" ON public.store_visitor_sessions;

CREATE OR REPLACE FUNCTION public.update_ebook_view(p_view_id uuid, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_view_id IS NULL THEN RAISE EXCEPTION 'invalid_view'; END IF;
  UPDATE public.ebook_views v SET
    pages_viewed = CASE WHEN p_payload ? 'pages_viewed' THEN greatest(coalesce(v.pages_viewed,0), least((p_payload->>'pages_viewed')::int, 10000)) ELSE v.pages_viewed END,
    max_page_reached = CASE WHEN p_payload ? 'max_page_reached' THEN greatest(coalesce(v.max_page_reached,0), least((p_payload->>'max_page_reached')::int, 10000)) ELSE v.max_page_reached END,
    time_on_book_seconds = CASE WHEN p_payload ? 'time_on_book_seconds' THEN greatest(coalesce(v.time_on_book_seconds,0), least((p_payload->>'time_on_book_seconds')::int, 86400)) ELSE v.time_on_book_seconds END,
    completed = coalesce(v.completed,false) OR coalesce((p_payload->>'completed')::boolean,false),
    last_activity_at = now(),
    reader_name = CASE WHEN p_payload ? 'reader_name' THEN left(nullif(p_payload->>'reader_name',''),200) ELSE v.reader_name END,
    reader_email = CASE WHEN p_payload ? 'reader_email' THEN left(nullif(p_payload->>'reader_email',''),320) ELSE v.reader_email END,
    reader_phone = CASE WHEN p_payload ? 'reader_phone' THEN left(nullif(p_payload->>'reader_phone',''),40) ELSE v.reader_phone END,
    consent_given = CASE WHEN p_payload ? 'consent_given' THEN (p_payload->>'consent_given')::boolean ELSE v.consent_given END,
    consent_text_version = CASE WHEN p_payload ? 'consent_text_version' THEN left(nullif(p_payload->>'consent_text_version',''),100) ELSE v.consent_text_version END,
    marketing_opt_in = CASE WHEN p_payload ? 'marketing_opt_in' THEN (p_payload->>'marketing_opt_in')::boolean ELSE v.marketing_opt_in END,
    consent_timestamp = CASE WHEN p_payload ? 'consent_timestamp' THEN nullif(p_payload->>'consent_timestamp','')::timestamptz ELSE v.consent_timestamp END
  WHERE v.id = p_view_id;
END $$;
REVOKE ALL ON FUNCTION public.update_ebook_view(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.update_ebook_view(uuid, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_store_visitor_cart(p_session_id text, p_cart_items jsonb, p_cart_subtotal numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 OR length(p_session_id) > 120 THEN RAISE EXCEPTION 'invalid_session'; END IF;
  UPDATE public.store_visitor_sessions SET
    cart_items = CASE WHEN jsonb_typeof(p_cart_items) = 'array' THEN p_cart_items ELSE NULL END,
    cart_subtotal = greatest(coalesce(p_cart_subtotal,0),0),
    cart_updated_at = now(),
    last_activity_at = now(),
    cart_processed = false
  WHERE session_id = p_session_id;
END $$;
REVOKE ALL ON FUNCTION public.sync_store_visitor_cart(text, jsonb, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_store_visitor_cart(text, jsonb, numeric) TO anon, authenticated, service_role;

-- 4. Funções privilegiadas sem search_path fixo.
ALTER FUNCTION public.get_lifecycle_metrics(uuid) SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message_metadata() SET search_path = public;
ALTER FUNCTION public.get_workspace_usage_counts() SET search_path = public;
ALTER FUNCTION public.fn_contact_audit_trigger() SET search_path = public;
ALTER FUNCTION public.fn_companies_audit_trigger() SET search_path = public;
ALTER FUNCTION public.record_product_price_change() SET search_path = public;
ALTER FUNCTION public.process_goods_receipt_item_v3() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;