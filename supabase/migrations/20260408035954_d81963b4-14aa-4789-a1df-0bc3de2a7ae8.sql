CREATE POLICY "Public can view active job offer results"
ON public.hr_talent_results
FOR SELECT
TO anon, authenticated
USING (
  search_type = 'job_offer'
  AND status IN ('new', 'reviewed')
);