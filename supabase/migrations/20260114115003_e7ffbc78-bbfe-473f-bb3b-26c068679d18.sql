-- Tabela para armazenar conexões OAuth do Instagram por workspace
CREATE TABLE public.instagram_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT,
  page_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

-- Policies: apenas membros do workspace podem ver/gerenciar conexões
CREATE POLICY "Workspace members can view instagram connections"
ON public.instagram_connections
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can manage instagram connections"
ON public.instagram_connections
FOR ALL
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Trigger para updated_at
CREATE TRIGGER update_instagram_connections_updated_at
BEFORE UPDATE ON public.instagram_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna channel_source na tabela conversations se não existir
-- para rastrear de qual integração veio a conversa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'channel_metadata'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN channel_metadata JSONB;
  END IF;
END $$;