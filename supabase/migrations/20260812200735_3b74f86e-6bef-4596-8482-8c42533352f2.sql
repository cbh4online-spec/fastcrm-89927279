CREATE TABLE public.builder_ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.builder_assets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  summary text,
  target_bid text,
  html_before text,
  html_after text,
  is_error boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_builder_ai_messages_asset ON public.builder_ai_messages(asset_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.builder_ai_messages TO authenticated;
GRANT ALL ON public.builder_ai_messages TO service_role;

ALTER TABLE public.builder_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY builder_ai_messages_select ON public.builder_ai_messages
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY builder_ai_messages_insert ON public.builder_ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY builder_ai_messages_delete ON public.builder_ai_messages
  FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));