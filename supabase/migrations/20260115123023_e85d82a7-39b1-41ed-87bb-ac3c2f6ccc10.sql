-- Add status and owner_id columns to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);

-- Update existing workspaces to set owner from workspace_members
UPDATE public.workspaces w
SET owner_id = (
  SELECT wm.user_id 
  FROM public.workspace_members wm 
  WHERE wm.workspace_id = w.id 
  AND wm.role = 'owner'
  LIMIT 1
)
WHERE owner_id IS NULL;