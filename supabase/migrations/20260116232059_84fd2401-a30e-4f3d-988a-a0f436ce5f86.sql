-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert industry labels for their workspace" ON workspace_industry_labels;
DROP POLICY IF EXISTS "Users can update their workspace industry labels" ON workspace_industry_labels;

-- Create new policies that allow all workspace members
CREATE POLICY "Users can insert industry labels for their workspace" ON workspace_industry_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace industry labels" ON workspace_industry_labels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );