
-- Create whatsapp_connections table
CREATE TABLE public.whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone_number_id TEXT,
  waba_id TEXT,
  display_phone_number TEXT,
  access_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  token_expires_at TIMESTAMPTZ,
  connected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_connections_workspace_id_key UNIQUE (workspace_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view whatsapp connections for their workspace"
ON public.whatsapp_connections FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert whatsapp connections for their workspace"
ON public.whatsapp_connections FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update whatsapp connections for their workspace"
ON public.whatsapp_connections FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete whatsapp connections for their workspace"
ON public.whatsapp_connections FOR DELETE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
