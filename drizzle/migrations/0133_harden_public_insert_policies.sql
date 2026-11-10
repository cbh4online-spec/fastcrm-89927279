-- 1. Product alerts: no public read of subscriber emails; lookups/cancel via RPC.
DROP POLICY IF EXISTS "Anyone can read product alerts" ON public.store_product_alerts;
DROP POLICY IF EXISTS "Anyone can create product alerts" ON public.store_product_alerts;
CREATE POLICY "Anyone can create product alerts" ON public.store_product_alerts FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(email) BETWEEN 5 AND 254 AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.workspace_id = store_product_alerts.workspace_id));
CREATE POLICY "Workspace members can read alerts" ON public.store_product_alerts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE OR REPLACE FUNCTION public.store_product_alert_status(p_product_id uuid, p_email text)
RETURNS TABLE(id uuid, alert_type text, target_price numeric, is_active boolean, notified_at timestamptz, created_at timestamptz, product_id uuid, workspace_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.alert_type::text, a.target_price, a.is_active, a.notified_at, a.created_at, a.product_id, a.workspace_id, a.email
  FROM public.store_product_alerts a
  WHERE a.product_id = p_product_id AND a.email = lower(trim(p_email)) AND a.is_active = true
  LIMIT 5;
$$;
CREATE OR REPLACE FUNCTION public.store_cancel_product_alert(p_alert_id uuid, p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.store_product_alerts SET is_active = false
  WHERE id = p_alert_id AND email = lower(trim(p_email)) AND is_active = true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
GRANT EXECUTE ON FUNCTION public.store_product_alert_status(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_cancel_product_alert(uuid, text) TO anon, authenticated;

-- 2. Coupon usage is written only server-side (checkout / Stripe webhook).
DROP POLICY IF EXISTS "Public can insert coupon usage on checkout" ON public.store_coupon_usage;

-- 3. Public event/form inserts must reference a real parent in the same workspace.
DROP POLICY IF EXISTS "Anyone can insert bio_events" ON public.bio_events;
CREATE POLICY "Anyone can insert bio_events" ON public.bio_events FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(event_type) <= 50 AND EXISTS (SELECT 1 FROM public.bio_pages b WHERE b.id = bio_page_id AND (bio_events.workspace_id IS NULL OR b.workspace_id = bio_events.workspace_id)));

DROP POLICY IF EXISTS "Anyone can create booking leads" ON public.booking_leads;
CREATE POLICY "Anyone can create booking leads" ON public.booking_leads FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(guest_name) BETWEEN 1 AND 200 AND char_length(guest_email) BETWEEN 5 AND 254
    AND coalesce(char_length(guest_message), 0) <= 5000
    AND EXISTS (SELECT 1 FROM public.booking_pages b WHERE b.id = booking_page_id AND b.workspace_id = booking_leads.workspace_id));

DROP POLICY IF EXISTS "Anon can insert answers" ON public.community_membership_answers;
CREATE POLICY "Anon can insert answers" ON public.community_membership_answers FOR INSERT TO anon
  WITH CHECK (char_length(answer_text) <= 5000 AND EXISTS (SELECT 1 FROM public.community_membership_questions q WHERE q.id = question_id AND q.workspace_id = community_membership_answers.workspace_id));

DROP POLICY IF EXISTS "ebook_cta_events_insert_anon" ON public.ebook_cta_events;
CREATE POLICY "ebook_cta_events_insert_anon" ON public.ebook_cta_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ebooks e WHERE e.id = ebook_id AND e.workspace_id = ebook_cta_events.workspace_id));
DROP POLICY IF EXISTS "Anyone can insert ebook_page_events" ON public.ebook_page_events;
CREATE POLICY "Anyone can insert ebook_page_events" ON public.ebook_page_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ebooks e WHERE e.id = ebook_id AND e.workspace_id = ebook_page_events.workspace_id));
DROP POLICY IF EXISTS "Anyone can insert ebook_views" ON public.ebook_views;
CREATE POLICY "Anyone can insert ebook_views" ON public.ebook_views FOR INSERT TO anon, authenticated
  WITH CHECK (coalesce(char_length(reader_email), 0) <= 254 AND EXISTS (SELECT 1 FROM public.ebooks e WHERE e.id = ebook_id AND e.workspace_id = ebook_views.workspace_id));

DROP POLICY IF EXISTS "Allow public insert" ON public.fastclub_applications;
CREATE POLICY "Allow public insert" ON public.fastclub_applications FOR INSERT TO anon
  WITH CHECK (char_length(full_name) BETWEEN 1 AND 200 AND char_length(email) BETWEEN 5 AND 254 AND char_length(motivation) <= 5000);

DROP POLICY IF EXISTS "Anyone can submit qualification form" ON public.fastcrm_proposals;
CREATE POLICY "Anyone can submit qualification form" ON public.fastcrm_proposals FOR INSERT TO anon
  WITH CHECK (char_length(company_name) BETWEEN 1 AND 200 AND char_length(contact_name) BETWEEN 1 AND 200 AND char_length(email) BETWEEN 5 AND 254
    AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id));

DROP POLICY IF EXISTS "funnel_events_anon_insert" ON public.funnel_events;
CREATE POLICY "funnel_events_anon_insert" ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_id AND f.workspace_id = funnel_events.workspace_id));
DROP POLICY IF EXISTS "funnel_submissions_anon_insert" ON public.funnel_submissions;
CREATE POLICY "funnel_submissions_anon_insert" ON public.funnel_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_id AND (funnel_submissions.workspace_id IS NULL OR f.workspace_id = funnel_submissions.workspace_id)));

DROP POLICY IF EXISTS "Anyone can submit a marketing lead" ON public.marketing_leads;
CREATE POLICY "Anyone can submit a marketing lead" ON public.marketing_leads FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(full_name) BETWEEN 1 AND 200 AND char_length(email) BETWEEN 5 AND 254 AND coalesce(char_length(message), 0) <= 5000 AND status = 'new');

DROP POLICY IF EXISTS "Anyone can insert popup_responses" ON public.popup_responses;
CREATE POLICY "Anyone can insert popup_responses" ON public.popup_responses FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id)
    AND (rule_id IS NULL OR EXISTS (SELECT 1 FROM public.popup_rules r WHERE r.id = rule_id AND r.workspace_id = popup_responses.workspace_id)));

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.seo_page_analytics;
CREATE POLICY "Anyone can insert analytics" ON public.seo_page_analytics FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(event_type) <= 50 AND coalesce(char_length(page_url), 0) <= 2000);

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.store_page_views;
CREATE POLICY "Anyone can insert page views" ON public.store_page_views FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.workspace_id = store_page_views.workspace_id));

DROP POLICY IF EXISTS "Anyone can create price requests" ON public.store_price_requests;
CREATE POLICY "Anyone can create price requests" ON public.store_price_requests FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(customer_name) BETWEEN 1 AND 200 AND char_length(customer_email) BETWEEN 5 AND 254 AND coalesce(char_length(message), 0) <= 5000
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.workspace_id = store_price_requests.workspace_id));

DROP POLICY IF EXISTS "Anyone can insert store tracking events" ON public.store_tracking_events;
CREATE POLICY "Anyone can insert store tracking events" ON public.store_tracking_events FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(event_type) <= 50 AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id));

DROP POLICY IF EXISTS "Anyone can insert landing events" ON public.vertical_landing_events;
CREATE POLICY "Anyone can insert landing events" ON public.vertical_landing_events FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(event_type) <= 50 AND coalesce(char_length(user_agent), 0) <= 1000);

DROP POLICY IF EXISTS "Anyone can insert widget messages" ON public.widget_messages;
DROP POLICY IF EXISTS "Public can create widget messages" ON public.widget_messages;
CREATE POLICY "Public can create widget messages" ON public.widget_messages FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(content) <= 10000 AND EXISTS (SELECT 1 FROM public.widget_conversations c WHERE c.id = conversation_id));

-- 4. Pin search_path on email queue helpers.
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;