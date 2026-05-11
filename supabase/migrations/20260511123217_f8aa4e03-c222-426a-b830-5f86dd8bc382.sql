CREATE TABLE IF NOT EXISTS public.conversation_contact_resolutions (
  conversation_id UUID PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  resolved_type TEXT NOT NULL CHECK (resolved_type IN ('lead','contact','company')),
  resolved_entity_id UUID NOT NULL,
  resolved_entity_name TEXT NOT NULL,
  matched_phone TEXT,
  normalized_e164 TEXT,
  ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
  candidates_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccr_workspace ON public.conversation_contact_resolutions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ccr_resolved_at ON public.conversation_contact_resolutions(resolved_at DESC);

ALTER TABLE public.conversation_contact_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view resolutions in their workspace"
  ON public.conversation_contact_resolutions
  FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- No INSERT/UPDATE/DELETE policies → only service_role (edge functions) can write.

CREATE TRIGGER trg_ccr_updated_at
  BEFORE UPDATE ON public.conversation_contact_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();