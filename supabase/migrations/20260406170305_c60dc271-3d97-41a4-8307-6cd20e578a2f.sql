
-- 1. Ticket portal tokens for shareable links
CREATE TABLE public.ticket_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_portal_tokens_token ON public.ticket_portal_tokens(token) WHERE is_active = true;
CREATE INDEX idx_portal_tokens_ticket ON public.ticket_portal_tokens(ticket_id);

ALTER TABLE public.ticket_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage tokens
CREATE POLICY "Workspace members can manage portal tokens"
  ON public.ticket_portal_tokens
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Public read for valid tokens (used by portal page)
CREATE POLICY "Anyone can read active tokens"
  ON public.ticket_portal_tokens
  FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 2. Helpdesk AI configuration
CREATE TABLE public.helpdesk_ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.7,
  system_prompt TEXT DEFAULT 'Responde de forma profissional e empática em português de Portugal. Sê conciso e útil.',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  max_auto_replies_per_day INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.helpdesk_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage AI config"
  ON public.helpdesk_ai_config
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
