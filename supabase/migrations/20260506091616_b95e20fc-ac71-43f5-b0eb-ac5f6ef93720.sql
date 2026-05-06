-- =========================================================
-- FASE 1G — Support Command Center
-- =========================================================

-- 1) Estender client_tickets com ligações ao WhatsApp Pro / CRM
ALTER TABLE public.client_tickets
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_message_id uuid,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_recommendation jsonb,
  ADD COLUMN IF NOT EXISTS ai_intent text,
  ADD COLUMN IF NOT EXISTS ai_urgency text,
  ADD COLUMN IF NOT EXISTS ai_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_client_tickets_conversation ON public.client_tickets(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_tickets_contact ON public.client_tickets(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_tickets_ai_draft ON public.client_tickets(workspace_id, ai_draft) WHERE ai_draft = true;
CREATE INDEX IF NOT EXISTS idx_client_tickets_escalation ON public.client_tickets(workspace_id, escalation_level) WHERE escalation_level > 0;

-- 2) Eventos do ticket (timeline auditável)
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.client_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  created_by uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket ON public.support_ticket_events(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ws ON public.support_ticket_events(workspace_id, created_at DESC);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view ticket events"
  ON public.support_ticket_events
  FOR SELECT
  TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can insert ticket events"
  ON public.support_ticket_events
  FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- 3) Categorias de suporte
CREATE TABLE IF NOT EXISTS public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  default_priority text,
  default_team_id uuid,
  default_sla_policy_id uuid,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_support_categories_ws_name
  ON public.support_categories(workspace_id, lower(name)) WHERE parent_id IS NULL;

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage support categories"
  ON public.support_categories
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

CREATE TRIGGER trg_support_categories_updated_at
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Seed de categorias padrão (PT) para workspaces que ainda não tenham nenhuma
INSERT INTO public.support_categories (workspace_id, name, default_priority, sort_order)
SELECT w.id, c.name, c.priority, c.ord
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Suporte Técnico', 'medium', 1),
  ('Reclamação', 'high', 2),
  ('Faturação', 'medium', 3),
  ('Entrega', 'medium', 4),
  ('Cancelamento', 'high', 5),
  ('Pré-venda', 'low', 6),
  ('Outro', 'low', 99)
) AS c(name, priority, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_categories sc WHERE sc.workspace_id = w.id
);
