-- 1) event_registry: registo interno de eventos do kernel. Leitura apenas para super admins;
--    edge functions usam service_role e não são afetadas.
DROP POLICY IF EXISTS "Authenticated users can read event_registry" ON public.event_registry;
CREATE POLICY "Super admins can read event_registry"
  ON public.event_registry
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 2) fastmatch_reputation_reviews: avaliações visíveis para membros do workspace
--    e para os participantes (avaliador/avaliado).
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.fastmatch_reputation_reviews;
CREATE POLICY "Workspace members and participants can view reviews"
  ON public.fastmatch_reputation_reviews
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_workspace_member(auth.uid(), workspace_id)
    OR reviewer_profile_id IN (
      SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid()
    )
    OR reviewed_profile_id IN (
      SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid()
    )
  );

-- 3) c2c_public_offers: submissão pública de ofertas (comprador sem login) é
--    capacidade intencional do marketplace. Mantém-se aberta, mas com validação
--    real dos dados em vez de WITH CHECK (true).
DROP POLICY IF EXISTS "Anyone can create public offers" ON public.c2c_public_offers;
CREATE POLICY "Anyone can create validated public offers"
  ON public.c2c_public_offers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND listing_id IS NOT NULL
    AND seller_id IS NOT NULL
    AND offered_price IS NOT NULL
    AND offered_price >= 0
    AND original_price IS NOT NULL
    AND original_price >= 0
    AND char_length(trim(customer_name)) BETWEEN 1 AND 200
    AND char_length(trim(customer_email)) BETWEEN 3 AND 320
    AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (customer_phone IS NULL OR char_length(customer_phone) <= 30)
    AND (message IS NULL OR char_length(message) <= 2000)
    AND char_length(currency) BETWEEN 1 AND 8
    AND (status IS NULL OR status IN ('pending', 'accepted', 'rejected', 'countered', 'expired'))
  );