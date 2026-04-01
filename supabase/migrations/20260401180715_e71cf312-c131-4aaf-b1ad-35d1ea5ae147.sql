
-- Create whatsapp_qr_connections table
CREATE TABLE public.whatsapp_qr_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'evolution_qr',
  status TEXT NOT NULL DEFAULT 'not_configured',
  qr_code TEXT,
  qr_updated_at TIMESTAMPTZ,
  phone_number TEXT,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_error TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_qr_connections_workspace_id_key UNIQUE (workspace_id),
  CONSTRAINT whatsapp_qr_connections_status_check CHECK (
    status IN ('not_configured', 'creating_instance', 'qr_pending', 'waiting_for_scan', 'connected', 'disconnected', 'qr_expired', 'reconnecting', 'error')
  )
);

-- Index on status for queries
CREATE INDEX idx_whatsapp_qr_connections_status ON public.whatsapp_qr_connections(status);

-- Enable RLS
ALTER TABLE public.whatsapp_qr_connections ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can view their QR connection"
  ON public.whatsapp_qr_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = whatsapp_qr_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace members can insert
CREATE POLICY "Workspace members can create QR connection"
  ON public.whatsapp_qr_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = whatsapp_qr_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace members can update
CREATE POLICY "Workspace members can update QR connection"
  ON public.whatsapp_qr_connections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = whatsapp_qr_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: service_role bypass is implicit

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_qr_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_qr_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
