CREATE TABLE public.bgi_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('month','quarter','year')),
  period_start date NOT NULL,
  content jsonb NOT NULL,
  input_hash text NOT NULL,
  model text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bgi_ai_insights_lookup ON public.bgi_ai_insights (workspace_id, period_type, period_start, created_at DESC);

GRANT SELECT ON public.bgi_ai_insights TO authenticated;
GRANT ALL ON public.bgi_ai_insights TO service_role;
ALTER TABLE public.bgi_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bgi insights read by members" ON public.bgi_ai_insights FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));