
-- RLS policies for kb_articles: allow authenticated users to INSERT, UPDATE, DELETE
CREATE POLICY "authenticated users can insert articles"
ON public.kb_articles FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated users can update articles"
ON public.kb_articles FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can delete articles"
ON public.kb_articles FOR DELETE TO authenticated
USING (true);

-- Allow reading ALL articles (including unpublished) for admin
DROP POLICY IF EXISTS "authenticated users can read published articles" ON public.kb_articles;
CREATE POLICY "authenticated users can read all articles"
ON public.kb_articles FOR SELECT TO authenticated
USING (true);

-- RLS policies for kb_categories: allow authenticated users to INSERT, UPDATE, DELETE
CREATE POLICY "authenticated users can insert categories"
ON public.kb_categories FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated users can update categories"
ON public.kb_categories FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "authenticated users can delete categories"
ON public.kb_categories FOR DELETE TO authenticated
USING (true);
