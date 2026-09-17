-- 1) c2c_sellers: anon só pode ler colunas públicas de vendedores aprovados
REVOKE ALL ON TABLE public.c2c_sellers FROM anon;
GRANT SELECT (
  id, user_id, workspace_id, display_name, bio, location, slug, status,
  avatar_url, is_verified, verification_status, avg_rating, total_reviews,
  total_sales, tier, created_at
) ON public.c2c_sellers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.c2c_sellers TO authenticated;
GRANT ALL ON public.c2c_sellers TO service_role;

DROP POLICY IF EXISTS "c2c_sellers_public_read_approved" ON public.c2c_sellers;
CREATE POLICY "c2c_sellers_public_read_approved"
ON public.c2c_sellers
FOR SELECT
TO anon
USING (status = 'approved'::c2c_seller_status);

-- 2) c2c_listings: leitura pública apenas de anúncios activos e aprovados
DROP POLICY IF EXISTS "c2c_listings_public_read" ON public.c2c_listings;
CREATE POLICY "c2c_listings_public_read"
ON public.c2c_listings
FOR SELECT
TO anon, authenticated
USING (status = 'active' AND moderation_status = 'approved');

DROP POLICY IF EXISTS "c2c_listings_seller_read" ON public.c2c_listings;
CREATE POLICY "c2c_listings_seller_read"
ON public.c2c_listings
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

-- anon não pode escrever nem ver notas internas de moderação
REVOKE ALL ON TABLE public.c2c_listings FROM anon;
GRANT SELECT (
  id, workspace_id, seller_id, category_id, title, description, price, currency,
  condition, photos, photos_360, videos, location, status, views_count,
  is_featured, moderation_status, created_at, updated_at, favorites_count,
  messages_count, slug, featured_until, is_boosted, boosted_until,
  shipping_available, price_negotiable, delivery_mode, shipping_cost,
  meetup_location, stock_quantity
) ON public.c2c_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.c2c_listings TO authenticated;
GRANT ALL ON public.c2c_listings TO service_role;