
-- Tabela de tracking de sincronização ImoAI Connect
CREATE TABLE public.imo_sync_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  raw_payload JSONB,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, source_table, source_id)
);

CREATE INDEX idx_imo_sync_status ON public.imo_sync_records(workspace_id, sync_status);
CREATE INDEX idx_imo_sync_source ON public.imo_sync_records(source_table, source_id);

ALTER TABLE public.imo_sync_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sync records" ON public.imo_sync_records
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_imo_sync_records_updated_at
  BEFORE UPDATE ON public.imo_sync_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
