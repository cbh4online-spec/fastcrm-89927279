
-- Progresso individual no Desafio 7 Dias
CREATE TABLE public.fastclub_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES fastclub_challenges(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.fastclub_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON public.fastclub_challenge_progress FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
  ON public.fastclub_challenge_progress FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
