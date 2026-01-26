-- Add goal_scope column to productivity_goals table
ALTER TABLE public.productivity_goals 
ADD COLUMN goal_scope TEXT DEFAULT 'individual' CHECK (goal_scope IN ('individual', 'organizational'));

-- Create index for efficient filtering by scope
CREATE INDEX idx_productivity_goals_scope ON public.productivity_goals(workspace_id, goal_scope);

-- Update RLS policies to allow organizational goals visibility
-- Users can view organizational goals from their workspace
CREATE POLICY "Users can view organizational goals in their workspace"
ON public.productivity_goals
FOR SELECT
USING (
  goal_scope = 'organizational' 
  AND EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = productivity_goals.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Allow workspace admins/owners to create organizational goals
CREATE POLICY "Admins can create organizational goals"
ON public.productivity_goals
FOR INSERT
WITH CHECK (
  goal_scope = 'organizational' 
  AND EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = productivity_goals.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

-- Allow any workspace member to update organizational goals (for progress updates)
CREATE POLICY "Members can update organizational goals"
ON public.productivity_goals
FOR UPDATE
USING (
  goal_scope = 'organizational' 
  AND EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = productivity_goals.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Only admins/owners or creator can delete organizational goals
CREATE POLICY "Admins can delete organizational goals"
ON public.productivity_goals
FOR DELETE
USING (
  goal_scope = 'organizational' 
  AND (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = productivity_goals.workspace_id 
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  )
);