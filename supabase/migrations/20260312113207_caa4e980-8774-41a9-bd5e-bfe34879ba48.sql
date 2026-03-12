-- Allow public access to published funnels by slug
CREATE POLICY "Public can view published funnels"
ON public.funnels
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Allow public access to funnel steps of published funnels
CREATE POLICY "Public can view steps of published funnels"
ON public.funnel_steps
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.funnels f
    WHERE f.id = funnel_steps.funnel_id
    AND f.is_published = true
  )
);
