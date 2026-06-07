
DROP POLICY IF EXISTS "Authenticated can view approved sellers" ON public.c2c_sellers;
DROP VIEW IF EXISTS public.c2c_sellers_public;
CREATE VIEW public.c2c_sellers_public WITH (security_invoker = true) AS
SELECT id, workspace_id, display_name, avatar_url, bio, location, slug, status,
       is_verified, verification_status, avg_rating, total_reviews, total_sales,
       tier, created_at
FROM public.c2c_sellers WHERE status = 'approved';
GRANT SELECT ON public.c2c_sellers_public TO anon, authenticated;

DROP POLICY IF EXISTS "anon_update_sessions" ON public.checkout_sessions;

DROP POLICY IF EXISTS "Public can view contact for published proposals" ON public.contacts;
DROP POLICY IF EXISTS "Public can view company for published proposals" ON public.companies;

CREATE OR REPLACE FUNCTION public.get_proposal_public_contact(_proposal_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name FROM public.contacts c
  JOIN public.proposals p ON p.contact_id = c.id
  WHERE p.id = _proposal_id AND p.status = 'published' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_proposal_public_company(_proposal_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT co.id, co.name FROM public.companies co
  JOIN public.proposals p ON p.company_id = co.id
  WHERE p.id = _proposal_id AND p.status = 'published' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_proposal_public_contact(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_public_company(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read CVs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "hr_cvs_anon_insert" ON storage.objects;

DROP POLICY IF EXISTS "Store settings are publicly readable" ON public.store_settings;
REVOKE SELECT ON public.store_settings FROM anon;
GRANT SELECT (
  id, workspace_id, store_name, store_description, logo_url, banner_url,
  primary_color, accent_color, footer_text, show_categories, show_search,
  store_slug, custom_domain, prices_include_vat, vat_rate, c2c_enabled,
  facebook_pixel_id, facebook_catalog_id, google_merchant_id, indexnow_key
) ON public.store_settings TO anon;
CREATE POLICY "Public can read store branding columns only"
ON public.store_settings FOR SELECT TO anon USING (true);

DROP VIEW IF EXISTS public.store_settings_public;
CREATE VIEW public.store_settings_public WITH (security_invoker = true) AS
SELECT id, workspace_id, store_name, store_description, logo_url, banner_url,
       primary_color, accent_color, footer_text, show_categories, show_search,
       store_slug, custom_domain, prices_include_vat, vat_rate, c2c_enabled,
       facebook_pixel_id, facebook_catalog_id, google_merchant_id, indexnow_key
FROM public.store_settings;
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read workspace branding" ON public.workspaces;
REVOKE SELECT ON public.workspaces FROM anon;
GRANT SELECT (id, name, slug, logo_url, primary_color, secondary_color, ui_mode)
ON public.workspaces TO anon;
CREATE POLICY "Public can read workspace branding columns only"
ON public.workspaces FOR SELECT TO anon USING (true);

DROP VIEW IF EXISTS public.workspaces_public;
CREATE VIEW public.workspaces_public WITH (security_invoker = true) AS
SELECT id, name, slug, logo_url, primary_color, secondary_color, ui_mode
FROM public.workspaces;
GRANT SELECT ON public.workspaces_public TO anon, authenticated;
