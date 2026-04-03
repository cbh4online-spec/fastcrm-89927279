CREATE POLICY "Public can view sheet-published products"
  ON public.products FOR SELECT
  USING (sheet_published = true);