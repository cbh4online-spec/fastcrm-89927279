
-- Enum for ticket types
CREATE TYPE public.ticket_type AS ENUM ('support', 'commercial', 'technical');

-- Enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_client', 'waiting_internal', 'resolved', 'closed');

-- Tickets table
CREATE TABLE public.client_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  client_user_id UUID REFERENCES public.client_users(id) NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  type ticket_type NOT NULL DEFAULT 'support',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  sla_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket messages table
CREATE TABLE public.client_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.client_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'client' CHECK (sender_type IN ('client', 'agent', 'system')),
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS for client_tickets
CREATE POLICY "Client users can view own company tickets"
ON public.client_tickets FOR SELECT
USING (
  company_id IN (
    SELECT cu.company_id FROM public.client_users cu
    WHERE cu.auth_user_id = auth.uid() AND cu.status IN ('active', 'pending')
  )
  OR
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Client users can create tickets"
ON public.client_tickets FOR INSERT
WITH CHECK (
  client_user_id IN (
    SELECT cu.id FROM public.client_users cu
    WHERE cu.auth_user_id = auth.uid() AND cu.status IN ('active', 'pending')
  )
);

CREATE POLICY "Workspace members can update tickets"
ON public.client_tickets FOR UPDATE
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
  OR
  client_user_id IN (
    SELECT cu.id FROM public.client_users cu
    WHERE cu.auth_user_id = auth.uid()
  )
);

-- RLS for ticket messages
CREATE POLICY "Users can view messages of accessible tickets"
ON public.client_ticket_messages FOR SELECT
USING (
  ticket_id IN (
    SELECT t.id FROM public.client_tickets t
    WHERE t.company_id IN (
      SELECT cu.company_id FROM public.client_users cu
      WHERE cu.auth_user_id = auth.uid()
    )
    OR t.workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Client users can create messages on their tickets"
ON public.client_ticket_messages FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT t.id FROM public.client_tickets t
    WHERE t.client_user_id IN (
      SELECT cu.id FROM public.client_users cu
      WHERE cu.auth_user_id = auth.uid()
    )
    OR t.workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_client_tickets_updated_at
BEFORE UPDATE ON public.client_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_client_tickets_company ON public.client_tickets(company_id);
CREATE INDEX idx_client_tickets_workspace ON public.client_tickets(workspace_id);
CREATE INDEX idx_client_tickets_status ON public.client_tickets(status);
CREATE INDEX idx_client_ticket_messages_ticket ON public.client_ticket_messages(ticket_id);
