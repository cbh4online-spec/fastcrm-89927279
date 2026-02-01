-- Drop existing policies and recreate with super admin support
DROP POLICY IF EXISTS "Users can manage flow variables" ON public.flow_variables;
DROP POLICY IF EXISTS "Users can view flow variables" ON public.flow_variables;
DROP POLICY IF EXISTS "Users can manage flow steps" ON public.flow_steps;
DROP POLICY IF EXISTS "Users can view flow steps" ON public.flow_steps;

-- Create new policies for flow_variables
CREATE POLICY "Super admins can manage flow variables"
ON public.flow_variables
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can manage flow variables in their workspace"
ON public.flow_variables
FOR ALL
USING (
  flow_id IN (
    SELECT cf.id FROM conversational_flows cf
    WHERE cf.workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  flow_id IN (
    SELECT cf.id FROM conversational_flows cf
    WHERE cf.workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
);

-- Create new policies for flow_steps
CREATE POLICY "Super admins can manage flow steps"
ON public.flow_steps
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can manage flow steps in their workspace"
ON public.flow_steps
FOR ALL
USING (
  flow_id IN (
    SELECT cf.id FROM conversational_flows cf
    WHERE cf.workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  flow_id IN (
    SELECT cf.id FROM conversational_flows cf
    WHERE cf.workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
);