
DROP POLICY IF EXISTS "Sellers can create livestreams" ON public.c2c_livestreams;
DROP POLICY IF EXISTS "Sellers can update own livestreams" ON public.c2c_livestreams;
DROP POLICY IF EXISTS "Sellers can delete own livestreams" ON public.c2c_livestreams;

CREATE POLICY "Sellers can create livestreams" ON public.c2c_livestreams
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own livestreams" ON public.c2c_livestreams
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own livestreams" ON public.c2c_livestreams
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid());
