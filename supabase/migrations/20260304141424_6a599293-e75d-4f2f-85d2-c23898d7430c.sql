-- Add DELETE policies for rfq_awards and rfq_award_items

CREATE POLICY "Members can delete rfq_awards"
ON public.rfq_awards
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = rfq_awards.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete rfq_award_items"
ON public.rfq_award_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rfq_awards ra
    JOIN public.workspace_members wm ON wm.workspace_id = ra.workspace_id AND wm.user_id = auth.uid()
    WHERE ra.id = rfq_award_items.award_id
  )
);