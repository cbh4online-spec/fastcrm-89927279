
-- Fix existing events with null workspace_id
UPDATE public.vertical_landing_events e
SET workspace_id = t.workspace_id
FROM public.vertical_templates t
WHERE e.template_slug = t.slug
  AND e.workspace_id IS NULL
  AND t.workspace_id IS NOT NULL;

-- Add RLS policy for reading events by template ownership
CREATE POLICY "Members read events by template ownership"
  ON public.vertical_landing_events FOR SELECT TO authenticated
  USING (
    template_slug IN (
      SELECT slug FROM public.vertical_templates
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );
