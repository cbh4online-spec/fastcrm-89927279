DROP POLICY IF EXISTS "System can insert analytics" ON public.proposal_analytics;
CREATE POLICY "Insert analytics for existing proposal" ON public.proposal_analytics
FOR INSERT TO anon, authenticated
WITH CHECK (
  proposal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_analytics.proposal_id
      AND p.workspace_id = proposal_analytics.workspace_id
  )
);