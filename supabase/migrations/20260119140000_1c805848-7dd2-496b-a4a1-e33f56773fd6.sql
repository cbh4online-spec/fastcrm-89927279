-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can insert invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can update invoice settings in their workspace" ON public.invoice_settings;

-- Recreate with proper policies that work with upsert
CREATE POLICY "Users can view invoice settings in their workspace"
ON public.invoice_settings
FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert invoice settings in their workspace"
ON public.invoice_settings
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invoice settings in their workspace"
ON public.invoice_settings
FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);