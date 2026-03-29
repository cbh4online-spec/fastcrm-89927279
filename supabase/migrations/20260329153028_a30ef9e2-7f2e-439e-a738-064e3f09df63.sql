
CREATE TABLE public.funnel_nurture_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  funnel_name TEXT,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  next_send_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_nurture_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_nurture_queue" ON public.funnel_nurture_queue
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "workspace_members_read_nurture_queue" ON public.funnel_nurture_queue
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "workspace_members_update_nurture_queue" ON public.funnel_nurture_queue
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "service_role_all_nurture_queue" ON public.funnel_nurture_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_funnel_nurture_queue_pending ON public.funnel_nurture_queue (next_send_at) WHERE status = 'pending';
