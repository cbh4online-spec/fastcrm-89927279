
CREATE TABLE public.community_membership_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.community_membership_questions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.community_members(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_membership_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can manage answers"
  ON public.community_membership_answers FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can insert own answers"
  ON public.community_membership_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can insert answers"
  ON public.community_membership_answers FOR INSERT
  TO anon
  WITH CHECK (true);
