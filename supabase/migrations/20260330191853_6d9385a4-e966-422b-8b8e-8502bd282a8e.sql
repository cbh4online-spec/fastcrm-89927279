
-- ═══════════════════════════════════════════════════
-- Enterprise Operating Ledger — 3 tables
-- ═══════════════════════════════════════════════════

-- 1. operating_ledger_chains
CREATE TABLE public.operating_ledger_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  root_event_id UUID,
  correlation_id TEXT NOT NULL,
  chain_type TEXT NOT NULL DEFAULT 'action_chain',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  outcome_type TEXT,
  outcome_id TEXT,
  outcome_value NUMERIC,
  outcome_currency TEXT DEFAULT 'EUR',
  outcome_summary TEXT,
  success_score INT,
  event_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_chains_ws_corr ON public.operating_ledger_chains(workspace_id, correlation_id);
CREATE INDEX idx_ledger_chains_ws_type ON public.operating_ledger_chains(workspace_id, chain_type, created_at DESC);

ALTER TABLE public.operating_ledger_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view ledger chains"
  ON public.operating_ledger_chains FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role manages ledger chains"
  ON public.operating_ledger_chains FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. operating_ledger_links
CREATE TABLE public.operating_ledger_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chain_id UUID REFERENCES public.operating_ledger_chains(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  parent_event_id UUID,
  relation_type TEXT NOT NULL DEFAULT 'triggered',
  depth INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_links_chain ON public.operating_ledger_links(chain_id, depth);
CREATE INDEX idx_ledger_links_event ON public.operating_ledger_links(event_id);

ALTER TABLE public.operating_ledger_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view ledger links"
  ON public.operating_ledger_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role manages ledger links"
  ON public.operating_ledger_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. ledger_settings
CREATE TABLE public.ledger_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_chain_build BOOLEAN NOT NULL DEFAULT true,
  max_chain_depth INT NOT NULL DEFAULT 20,
  retain_raw_payloads BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view ledger settings"
  ON public.ledger_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can upsert ledger settings"
  ON public.ledger_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can update ledger settings"
  ON public.ledger_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role manages ledger settings"
  ON public.ledger_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
