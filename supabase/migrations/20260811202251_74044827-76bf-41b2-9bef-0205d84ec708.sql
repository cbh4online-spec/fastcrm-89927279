
-- 1. PROFILES ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shares_workspace_with(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members a
    JOIN public.workspace_members b ON b.workspace_id = a.workspace_id
    WHERE a.user_id = _viewer AND b.user_id = _target
  );
$$;

GRANT EXECUTE ON FUNCTION public.shares_workspace_with(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;

CREATE POLICY "Users can view own or same-workspace profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR public.shares_workspace_with(auth.uid(), user_id)
);

-- 2. WORKSPACES -------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view workspace for c2c marketplace" ON public.workspaces;
DROP POLICY IF EXISTS "Public can view workspace for live bio pages" ON public.workspaces;
DROP POLICY IF EXISTS "Public can view workspace for published proposals" ON public.workspaces;

CREATE OR REPLACE VIEW public.public_workspaces
WITH (security_invoker = false)
AS
SELECT w.id, w.name, w.slug, w.logo_url, w.primary_color, w.secondary_color, w.ui_mode
FROM public.workspaces w
WHERE w.id IN (SELECT workspace_id FROM public.c2c_listings WHERE status = 'active' AND moderation_status = 'approved')
   OR w.id IN (SELECT workspace_id FROM public.c2c_sellers WHERE status = 'approved')
   OR w.id IN (SELECT workspace_id FROM public.bio_pages WHERE status = 'live')
   OR w.id IN (SELECT workspace_id FROM public.proposals WHERE status = 'published')
   OR w.id IN (SELECT workspace_id FROM public.store_settings)
   OR w.id IN (SELECT workspace_id FROM public.landing_pages);

GRANT SELECT ON public.public_workspaces TO anon, authenticated;

-- Emissor de uma proposta publicada (inclui dados de pagamento) por slug
CREATE OR REPLACE FUNCTION public.get_proposal_issuer(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  company_name text,
  company_iban text,
  signature_name text,
  signature_title text,
  payment_info text,
  primary_color text,
  secondary_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name, w.logo_url, w.company_name, w.company_iban,
         w.signature_name, w.signature_title, w.payment_info,
         w.primary_color, w.secondary_color
  FROM public.proposals p
  JOIN public.workspaces w ON w.id = p.workspace_id
  WHERE p.slug = _slug AND p.status = 'published'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_proposal_issuer(text) TO anon, authenticated;

-- 3. STORE REFERRAL CODES ---------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read referral codes for validation" ON public.store_referral_codes;

CREATE OR REPLACE FUNCTION public.validate_referral_code(_workspace_id uuid, _code text)
RETURNS TABLE (id uuid, user_id uuid, code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user_id, c.code
  FROM public.store_referral_codes c
  WHERE c.workspace_id = _workspace_id
    AND upper(btrim(c.code)) = upper(btrim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(uuid, text) TO anon, authenticated;
