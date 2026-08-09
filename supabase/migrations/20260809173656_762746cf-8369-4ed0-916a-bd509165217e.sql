CREATE POLICY "pcs_public_read_published"
ON public.product_content_sections
FOR SELECT
TO anon, authenticated
USING (is_published = true);

GRANT SELECT ON public.product_content_sections TO anon;
GRANT SELECT ON public.product_content_sections TO authenticated;

CREATE POLICY "product_qa_public_ask"
ON public.product_qa
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_approved = false
  AND answer IS NULL
  AND source = 'customer'
  AND length(question) BETWEEN 5 AND 500
  AND (asker_name IS NULL OR length(asker_name) <= 60)
);

GRANT INSERT ON public.product_qa TO anon;
GRANT INSERT ON public.product_qa TO authenticated;