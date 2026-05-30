
-- ============================================================
-- SECURITY HARDENING v2
-- ============================================================

-- 1) gdpr_consents
DROP POLICY IF EXISTS "Visitors can read own consent" ON public.gdpr_consents;
DROP POLICY IF EXISTS "Visitors can update own consent" ON public.gdpr_consents;

CREATE OR REPLACE FUNCTION public.get_my_gdpr_consent(p_visitor_id text)
RETURNS TABLE(consent_necessary boolean, consent_analytics boolean, consent_marketing boolean, consent_updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT consent_necessary, consent_analytics, consent_marketing, consent_updated_at
  FROM public.gdpr_consents WHERE visitor_id = p_visitor_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_gdpr_consent(
  p_visitor_id text, p_necessary boolean, p_analytics boolean, p_marketing boolean, p_user_agent text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_visitor_id IS NULL OR length(p_visitor_id) < 4 OR length(p_visitor_id) > 128 THEN
    RAISE EXCEPTION 'invalid visitor_id';
  END IF;
  INSERT INTO public.gdpr_consents (visitor_id, consent_necessary, consent_analytics, consent_marketing, user_agent)
  VALUES (p_visitor_id, COALESCE(p_necessary,true), COALESCE(p_analytics,false), COALESCE(p_marketing,false), LEFT(COALESCE(p_user_agent,''), 512))
  ON CONFLICT (visitor_id) DO UPDATE SET
    consent_necessary  = EXCLUDED.consent_necessary,
    consent_analytics  = EXCLUDED.consent_analytics,
    consent_marketing  = EXCLUDED.consent_marketing,
    consent_updated_at = now();
END$$;

REVOKE ALL ON FUNCTION public.get_my_gdpr_consent(text) FROM public;
REVOKE ALL ON FUNCTION public.upsert_my_gdpr_consent(text,boolean,boolean,boolean,text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_gdpr_consent(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_gdpr_consent(text,boolean,boolean,boolean,text) TO anon, authenticated;

-- 2) store_gift_cards
DROP POLICY IF EXISTS "Anyone can read gift cards by code" ON public.store_gift_cards;

CREATE POLICY "Workspace members can read gift cards" ON public.store_gift_cards
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_gift_card_code(p_code text, p_workspace_id uuid)
RETURNS TABLE(id uuid, code text, current_balance numeric, currency text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, current_balance, currency, status, expires_at
  FROM public.store_gift_cards
  WHERE code = upper(trim(p_code))
    AND workspace_id = p_workspace_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND current_balance > 0
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_gift_card_code(text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_gift_card_code(text,uuid) TO anon, authenticated;

-- 3) store_offers
DROP POLICY IF EXISTS "Anyone can read offers by email" ON public.store_offers;

CREATE POLICY "Workspace members can read offers" ON public.store_offers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = store_offers.workspace_id AND wm.user_id = auth.uid()
));

-- 4) workspace_invites (token = uuid)
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.workspace_invites;

CREATE OR REPLACE FUNCTION public.get_workspace_invite_by_token(p_token uuid)
RETURNS TABLE(id uuid, workspace_id uuid, email text, role text, status text, expires_at timestamptz, workspace_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.workspace_id, i.email, i.role::text, i.status, i.expires_at, w.name
  FROM public.workspace_invites i
  LEFT JOIN public.workspaces w ON w.id = i.workspace_id
  WHERE i.invite_token = p_token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_workspace_invite_by_token(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_workspace_invite_by_token(uuid) TO anon, authenticated;

-- 5) c2c_seller_invites (token = text)
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.c2c_seller_invites;

CREATE OR REPLACE FUNCTION public.get_c2c_seller_invite_by_token(p_token text)
RETURNS TABLE(id uuid, workspace_id uuid, email text, name text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, workspace_id, email, name, status, expires_at
  FROM public.c2c_seller_invites
  WHERE invite_token = p_token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_c2c_seller_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_c2c_seller_invite_by_token(text) TO anon, authenticated;

-- 6) community_members (token = uuid)
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.community_members;

CREATE OR REPLACE FUNCTION public.get_community_invite_by_token(p_token uuid)
RETURNS TABLE(id uuid, workspace_id uuid, name text, email text, status text, invite_expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, workspace_id, name, email, status, invite_expires_at
  FROM public.community_members
  WHERE invite_token = p_token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_community_invite_by_token(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_community_invite_by_token(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_community_member_by_token(p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.community_members
  SET status = 'active', joined_at = now()
  WHERE invite_token = p_token
    AND status = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now());
$$;
REVOKE ALL ON FUNCTION public.activate_community_member_by_token(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.activate_community_member_by_token(uuid) TO anon, authenticated;

-- 7) demo_leads
DROP POLICY IF EXISTS "Authenticated users can view demo_leads" ON public.demo_leads;
DROP POLICY IF EXISTS "Service role can manage demo_leads" ON public.demo_leads;

CREATE POLICY "Super admins read demo_leads" ON public.demo_leads
FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage demo_leads" ON public.demo_leads
FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- 8) activation_goals: hide detection_query column
REVOKE SELECT (detection_query) ON public.activation_goals FROM authenticated;
REVOKE SELECT (detection_query) ON public.activation_goals FROM anon;

-- 9) event_test_cases: super admins only
DROP POLICY IF EXISTS "Authenticated users can read event_test_cases" ON public.event_test_cases;
DROP POLICY IF EXISTS "Authenticated users can insert event_test_cases" ON public.event_test_cases;
DROP POLICY IF EXISTS "Authenticated users can update event_test_cases" ON public.event_test_cases;

CREATE POLICY "Super admins read event_test_cases" ON public.event_test_cases
FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins insert event_test_cases" ON public.event_test_cases
FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins update event_test_cases" ON public.event_test_cases
FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- 10) product_price_history
DROP POLICY IF EXISTS "product_price_history_public_read" ON public.product_price_history;

CREATE POLICY "product_price_history_workspace_read" ON public.product_price_history
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = product_price_history.workspace_id AND wm.user_id = auth.uid()
  )
);
