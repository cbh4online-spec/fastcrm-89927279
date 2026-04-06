
-- Time entries table
CREATE TABLE public.support_ticket_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  entry_type TEXT NOT NULL DEFAULT 'manual' CHECK (entry_type IN ('manual', 'timer')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) GENERATED ALWAYS AS (ROUND((duration_minutes / 60.0) * hourly_rate, 2)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view time entries" ON public.support_ticket_time_entries
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create time entries" ON public.support_ticket_time_entries
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authors can update time entries" ON public.support_ticket_time_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authors can delete time entries" ON public.support_ticket_time_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Expenses table
CREATE TABLE public.support_ticket_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expense_type TEXT NOT NULL DEFAULT 'outro' CHECK (expense_type IN ('deslocacao', 'material', 'licenca', 'outro')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses" ON public.support_ticket_expenses
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create expenses" ON public.support_ticket_expenses
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authors can update expenses" ON public.support_ticket_expenses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authors can delete expenses" ON public.support_ticket_expenses
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Denormalized columns on support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Trigger function to recalculate totals
CREATE OR REPLACE FUNCTION public.recalc_ticket_time_and_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_id UUID;
  _total_time INTEGER;
  _time_cost NUMERIC;
  _expense_cost NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _ticket_id := OLD.ticket_id;
  ELSE
    _ticket_id := NEW.ticket_id;
  END IF;

  SELECT COALESCE(SUM(duration_minutes), 0), COALESCE(SUM(cost), 0)
  INTO _total_time, _time_cost
  FROM public.support_ticket_time_entries
  WHERE ticket_id = _ticket_id;

  SELECT COALESCE(SUM(amount), 0)
  INTO _expense_cost
  FROM public.support_ticket_expenses
  WHERE ticket_id = _ticket_id;

  UPDATE public.support_tickets
  SET total_time_minutes = _total_time,
      total_cost = _time_cost + _expense_cost,
      updated_at = now()
  WHERE id = _ticket_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers on time entries
CREATE TRIGGER trg_recalc_time_on_time_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.support_ticket_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.recalc_ticket_time_and_cost();

-- Triggers on expenses
CREATE TRIGGER trg_recalc_time_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON public.support_ticket_expenses
  FOR EACH ROW EXECUTE FUNCTION public.recalc_ticket_time_and_cost();

-- Indexes
CREATE INDEX idx_time_entries_ticket ON public.support_ticket_time_entries(ticket_id);
CREATE INDEX idx_expenses_ticket ON public.support_ticket_expenses(ticket_id);
