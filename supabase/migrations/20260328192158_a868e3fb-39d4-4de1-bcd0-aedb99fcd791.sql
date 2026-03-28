
-- Enums for support tickets
CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_client', 'waiting_internal', 'on_hold', 'resolved', 'closed');
CREATE TYPE public.support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.support_ticket_type AS ENUM ('support', 'commercial', 'technical', 'billing', 'feature_request');
CREATE TYPE public.support_ticket_channel AS ENUM ('email', 'phone', 'portal', 'chat', 'manual');
CREATE TYPE public.support_message_sender AS ENUM ('agent', 'client', 'system');

-- Support Tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_number serial NOT NULL,
  subject text NOT NULL,
  description text,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  type public.support_ticket_type NOT NULL DEFAULT 'support',
  channel public.support_ticket_channel NOT NULL DEFAULT 'manual',
  department text,
  assigned_to uuid,
  contact_id uuid,
  company_id uuid,
  tags text[] DEFAULT '{}',
  sla_deadline timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_workspace ON public.support_tickets(workspace_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(workspace_id, status);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(workspace_id, priority);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view support tickets"
  ON public.support_tickets FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members can update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members can delete support tickets"
  ON public.support_tickets FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')) OR public.is_super_admin(auth.uid()));

-- Support Ticket Messages table
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type public.support_message_sender NOT NULL DEFAULT 'agent',
  sender_id uuid,
  message text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON public.support_ticket_messages(ticket_id);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (ticket_id IN (
    SELECT id FROM public.support_tickets WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members can create ticket messages"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM public.support_tickets WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ) OR public.is_super_admin(auth.uid()));

-- Support Canned Responses table
CREATE TABLE public.support_canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  shortcut text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_canned_responses_workspace ON public.support_canned_responses(workspace_id);

ALTER TABLE public.support_canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view canned responses"
  ON public.support_canned_responses FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members can manage canned responses"
  ON public.support_canned_responses FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- Enable realtime for support_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
