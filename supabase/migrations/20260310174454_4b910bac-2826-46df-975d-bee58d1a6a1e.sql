
-- Create security_clients table
CREATE TABLE public.security_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_type TEXT NOT NULL DEFAULT 'particular' CHECK (client_type IN ('particular', 'empresa', 'condominio')),
  name TEXT NOT NULL,
  trade_name TEXT,
  nif TEXT,
  fiscal_address TEXT,
  fiscal_postal_code TEXT,
  fiscal_locality TEXT,
  fiscal_country TEXT DEFAULT 'Portugal',
  primary_phone TEXT,
  secondary_phone TEXT,
  primary_email TEXT,
  website TEXT,
  contact_person_name TEXT,
  contact_person_phone TEXT,
  contact_person_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  company_id UUID,
  contact_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add client_id to security_installation_sites
ALTER TABLE public.security_installation_sites
  ADD COLUMN client_id UUID REFERENCES public.security_clients(id) ON DELETE SET NULL;

-- Add client_id to security_systems  
ALTER TABLE public.security_systems
  ADD COLUMN client_id UUID REFERENCES public.security_clients(id) ON DELETE SET NULL;

-- Add client_id to security_contracts
ALTER TABLE public.security_contracts
  ADD COLUMN client_id UUID REFERENCES public.security_clients(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.security_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view security clients in their workspace"
  ON public.security_clients FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert security clients in their workspace"
  ON public.security_clients FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update security clients in their workspace"
  ON public.security_clients FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete security clients in their workspace"
  ON public.security_clients FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Index for common lookups
CREATE INDEX idx_security_clients_workspace ON public.security_clients(workspace_id);
CREATE INDEX idx_security_clients_nif ON public.security_clients(workspace_id, nif) WHERE nif IS NOT NULL;
CREATE INDEX idx_security_installation_sites_client ON public.security_installation_sites(client_id) WHERE client_id IS NOT NULL;
