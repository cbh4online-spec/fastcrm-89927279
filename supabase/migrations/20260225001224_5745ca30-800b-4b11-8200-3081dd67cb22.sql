CREATE TABLE public.ask_fastcrm_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  intent text,
  items_count integer DEFAULT 0,
  action_executed text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ask_logs_workspace ON public.ask_fastcrm_query_logs (workspace_id, created_at DESC);

ALTER TABLE public.ask_fastcrm_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.ask_fastcrm_query_logs
  FOR ALL USING (true) WITH CHECK (true);