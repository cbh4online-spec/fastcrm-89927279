
-- Enums
CREATE TYPE public.time_entry_status AS ENUM ('active','completed','edited','flagged');
CREATE TYPE public.leave_request_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE public.leave_type AS ENUM ('vacation','sick','personal','remote','other');

-- Time Entries
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  clock_in_lat numeric,
  clock_in_lng numeric,
  clock_out_lat numeric,
  clock_out_lng numeric,
  clock_in_address text,
  clock_out_address text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  status time_entry_status NOT NULL DEFAULT 'active',
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries" ON public.time_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT w.id FROM public.workspaces w JOIN public.workspace_members wm ON wm.workspace_id = w.id WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can insert own time entries" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can update own or managers all" ON public.time_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));

-- Session Time Logs
CREATE TABLE public.session_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  active_seconds integer NOT NULL DEFAULT 0,
  idle_seconds integer NOT NULL DEFAULT 0,
  total_seconds integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id, date)
);
ALTER TABLE public.session_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session logs in workspace" ON public.session_time_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can upsert own session logs" ON public.session_time_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can update own session logs" ON public.session_time_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Leave Requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  leave_type leave_type NOT NULL DEFAULT 'vacation',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric NOT NULL DEFAULT 0,
  reason text,
  status leave_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leave requests in workspace" ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can insert own leave requests" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Managers can update leave requests" ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));

-- Leave Balances
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  total_days numeric NOT NULL DEFAULT 22,
  used_days numeric NOT NULL DEFAULT 0,
  pending_days numeric NOT NULL DEFAULT 0,
  UNIQUE(workspace_id, user_id, year)
);
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leave balances in workspace" ON public.leave_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can insert own leave balances" ON public.leave_balances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
CREATE POLICY "Users can update own leave balances" ON public.leave_balances FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));
