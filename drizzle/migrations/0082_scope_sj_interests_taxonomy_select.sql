DROP POLICY IF EXISTS "sj_interests_taxonomy_select" ON public.sj_interests_taxonomy;
REVOKE SELECT ON public.sj_interests_taxonomy FROM anon;