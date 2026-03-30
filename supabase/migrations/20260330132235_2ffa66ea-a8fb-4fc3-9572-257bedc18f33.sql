
-- ============================================================
-- Enrich client_tickets with professional fields
-- ============================================================
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal';
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;

-- ============================================================
-- Enrich client_ticket_messages
-- ============================================================
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN DEFAULT false;

-- Drop old check constraint to allow 'ai' sender_type
ALTER TABLE client_ticket_messages DROP CONSTRAINT IF EXISTS client_ticket_messages_sender_type_check;
ALTER TABLE client_ticket_messages ADD CONSTRAINT client_ticket_messages_sender_type_check 
  CHECK (sender_type IN ('client', 'agent', 'system', 'ai'));

-- ============================================================
-- ticket_sla_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_sla_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  priority TEXT NOT NULL,
  first_response_hours INTEGER NOT NULL DEFAULT 4,
  resolution_hours INTEGER NOT NULL DEFAULT 24,
  escalation_after_hours INTEGER,
  escalate_to UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, priority)
);

ALTER TABLE ticket_sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage SLA rules"
  ON ticket_sla_rules FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

-- ============================================================
-- ticket_canned_responses (for client tickets, separate from support_canned_responses)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_canned_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  shortcut TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ticket_canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage canned responses"
  ON ticket_canned_responses FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_tickets_ws_status ON client_tickets(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_client_tickets_ws_assigned ON client_tickets(workspace_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_tickets_ws_sla ON client_tickets(workspace_id, sla_deadline) WHERE sla_breached = false;
CREATE INDEX IF NOT EXISTS idx_client_ticket_messages_ticket_created ON client_ticket_messages(ticket_id, created_at);

-- ============================================================
-- Auto-generate ticket_number trigger
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN ticket_number ~ '^TK-[0-9]+$'
      THEN CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM client_tickets
  WHERE workspace_id = NEW.workspace_id;

  NEW.ticket_number := 'TK-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON client_tickets;
CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON client_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- Auto-calculate sla_deadline trigger
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_sla_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hours INTEGER;
BEGIN
  SELECT resolution_hours INTO hours
  FROM ticket_sla_rules
  WHERE workspace_id = NEW.workspace_id
    AND priority = NEW.priority::TEXT
    AND is_active = true
  LIMIT 1;

  IF hours IS NOT NULL THEN
    NEW.sla_deadline := NEW.created_at + (hours || ' hours')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_sla_deadline ON client_tickets;
CREATE TRIGGER trg_calculate_sla_deadline
  BEFORE INSERT ON client_tickets
  FOR EACH ROW
  WHEN (NEW.sla_deadline IS NULL)
  EXECUTE FUNCTION calculate_sla_deadline();

-- ============================================================
-- Enable realtime for messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE client_ticket_messages;
