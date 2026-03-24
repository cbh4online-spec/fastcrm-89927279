
-- ============================================================
-- ACCOUNT BRIEF OPERATIONAL LAYER — FASE 1
-- Pricing/Quotas, Job Queue, Dedupe, Source Lineage
-- ============================================================

-- 1. PRICING & USAGE
CREATE TABLE IF NOT EXISTS public.account_brief_plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  limit_value INT NOT NULL DEFAULT 0,
  billing_mode TEXT NOT NULL DEFAULT 'included',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_code, metric_key)
);

CREATE TABLE IF NOT EXISTS public.account_brief_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.account_brief_accounts(id) ON DELETE SET NULL,
  analysis_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  units_consumed INT NOT NULL DEFAULT 1,
  source_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_brief_usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  units_used INT NOT NULL DEFAULT 0,
  units_limit INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, period_key, metric_key)
);

-- 2. JOB QUEUE
CREATE TABLE IF NOT EXISTS public.account_brief_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  timeout_ms INT NOT NULL DEFAULT 120000,
  correlation_id TEXT,
  error_summary TEXT,
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_brief_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.account_brief_job_queue(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DEDUPE & CANONICAL IDENTITY
CREATE TABLE IF NOT EXISTS public.account_brief_domain_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'redirect',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_brief_duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id_a UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  account_id_b UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  duplicate_reason TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SOURCE LINEAGE & CONFIDENCE
CREATE TABLE IF NOT EXISTS public.account_brief_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value_json JSONB,
  canonical_value_text TEXT,
  current_confidence_score NUMERIC(3,2) DEFAULT 0,
  current_source_type TEXT DEFAULT 'observed_on_site',
  current_provenance_type TEXT DEFAULT 'observed_on_site',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, account_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.account_brief_field_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value_json JSONB,
  source_type TEXT NOT NULL,
  source_label TEXT,
  source_url TEXT,
  source_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  provenance_type TEXT NOT NULL DEFAULT 'observed_on_site',
  observed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.account_brief_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.account_brief_accounts(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  body TEXT,
  channel TEXT NOT NULL DEFAULT 'feed',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  snoozed_until TIMESTAMPTZ,
  related_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_brief_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'feed',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  min_priority TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id, notification_type, channel)
);

-- 6. OUTREACH POLICIES
CREATE TABLE IF NOT EXISTS public.account_brief_outreach_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  min_score_to_generate INT DEFAULT 40,
  min_confidence_to_generate NUMERIC(3,2) DEFAULT 0.50,
  human_review_required BOOLEAN NOT NULL DEFAULT true,
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  policy_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

-- 7. BATCH OPERATIONS
CREATE TABLE IF NOT EXISTS public.account_brief_batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL,
  batch_type TEXT NOT NULL,
  total_items INT NOT NULL DEFAULT 0,
  processed_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_brief_batch_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_run_id UUID NOT NULL REFERENCES public.account_brief_batch_runs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. KPI SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.account_brief_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, snapshot_date, metric_key)
);

-- 9. SCORE MODEL VERSIONING
CREATE TABLE IF NOT EXISTS public.account_brief_score_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL DEFAULT 'default',
  version_code TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, version_code)
);

-- 10. RETENTION POLICIES
CREATE TABLE IF NOT EXISTS public.account_brief_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  policy_key TEXT NOT NULL,
  retention_days INT NOT NULL DEFAULT 365,
  archive_after_days INT DEFAULT 180,
  purge_after_days INT DEFAULT 730,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, policy_key)
);

-- 11. ERROR CATALOG
CREATE TABLE IF NOT EXISTS public.account_brief_error_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code TEXT NOT NULL UNIQUE,
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  user_message TEXT NOT NULL,
  admin_message TEXT,
  suggested_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. ADD GOVERNANCE FIELDS TO ACCOUNTS
ALTER TABLE public.account_brief_accounts ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.account_brief_accounts ADD COLUMN IF NOT EXISTS assigned_user_id UUID;

-- 13. ADD VISIBILITY TO NOTES
ALTER TABLE public.account_brief_notes ADD COLUMN IF NOT EXISTS visibility_type TEXT NOT NULL DEFAULT 'team';

-- 14. ADD SCORE VERSION TO SCORES
ALTER TABLE public.account_brief_scores ADD COLUMN IF NOT EXISTS score_model_version_id UUID REFERENCES public.account_brief_score_model_versions(id);
ALTER TABLE public.account_brief_scores ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);
ALTER TABLE public.account_brief_scores ADD COLUMN IF NOT EXISTS score_validity_status TEXT DEFAULT 'current';

-- RLS on all new tables
ALTER TABLE public.account_brief_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_job_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_domain_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_field_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_outreach_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_batch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_batch_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_score_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_brief_error_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policies (workspace-scoped)
CREATE POLICY "ab_plan_limits_read" ON public.account_brief_plan_limits FOR SELECT TO authenticated USING (true);

CREATE POLICY "ab_usage_events_ws" ON public.account_brief_usage_events FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_usage_counters_ws" ON public.account_brief_usage_counters FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_job_queue_ws" ON public.account_brief_job_queue FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_job_steps_ws" ON public.account_brief_job_steps FOR ALL USING (
  job_id IN (SELECT jq.id FROM public.account_brief_job_queue jq WHERE jq.workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
);
CREATE POLICY "ab_domain_aliases_ws" ON public.account_brief_domain_aliases FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_duplicate_candidates_ws" ON public.account_brief_duplicate_candidates FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_field_values_ws" ON public.account_brief_field_values FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_field_lineage_ws" ON public.account_brief_field_lineage FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_notifications_ws" ON public.account_brief_notifications FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_notification_prefs_ws" ON public.account_brief_notification_prefs FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_outreach_policies_ws" ON public.account_brief_outreach_policies FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_batch_runs_ws" ON public.account_brief_batch_runs FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_batch_items_ws" ON public.account_brief_batch_run_items FOR ALL USING (
  batch_run_id IN (SELECT br.id FROM public.account_brief_batch_runs br WHERE br.workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
);
CREATE POLICY "ab_kpi_snapshots_ws" ON public.account_brief_kpi_snapshots FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_score_model_versions_ws" ON public.account_brief_score_model_versions FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_retention_policies_ws" ON public.account_brief_retention_policies FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "ab_error_catalog_read" ON public.account_brief_error_catalog FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_usage_events_ws ON public.account_brief_usage_events(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ab_usage_counters_ws ON public.account_brief_usage_counters(workspace_id, period_key);
CREATE INDEX IF NOT EXISTS idx_ab_job_queue_ws_status ON public.account_brief_job_queue(workspace_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_ab_job_queue_scheduled ON public.account_brief_job_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ab_domain_aliases_domain ON public.account_brief_domain_aliases(workspace_id, normalized_domain);
CREATE INDEX IF NOT EXISTS idx_ab_duplicate_candidates_ws ON public.account_brief_duplicate_candidates(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_field_values_account ON public.account_brief_field_values(workspace_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ab_notifications_ws ON public.account_brief_notifications(workspace_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_ab_batch_runs_ws ON public.account_brief_batch_runs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_kpi_snapshots_ws ON public.account_brief_kpi_snapshots(workspace_id, snapshot_date);

-- Seed plan limits
INSERT INTO public.account_brief_plan_limits (plan_code, metric_key, limit_value, billing_mode) VALUES
  ('trial', 'active_accounts', 5, 'included'),
  ('trial', 'initial_analyses_month', 5, 'included'),
  ('trial', 'reanalyses_month', 3, 'included'),
  ('trial', 'watchlist_accounts', 2, 'included'),
  ('trial', 'pdf_exports_month', 3, 'included'),
  ('trial', 'outreach_generations_month', 5, 'included'),
  ('trial', 'batch_actions_month', 2, 'included'),
  ('trial', 'enrichment_runs_month', 0, 'included'),
  ('trial', 'max_accounts_per_segment', 10, 'included'),
  ('trial', 'comparisons_month', 3, 'included'),
  ('starter', 'active_accounts', 25, 'included'),
  ('starter', 'initial_analyses_month', 25, 'included'),
  ('starter', 'reanalyses_month', 15, 'included'),
  ('starter', 'watchlist_accounts', 10, 'included'),
  ('starter', 'pdf_exports_month', 15, 'included'),
  ('starter', 'outreach_generations_month', 20, 'included'),
  ('starter', 'batch_actions_month', 10, 'included'),
  ('starter', 'enrichment_runs_month', 5, 'included'),
  ('starter', 'max_accounts_per_segment', 25, 'included'),
  ('starter', 'comparisons_month', 10, 'included'),
  ('growth', 'active_accounts', 100, 'included'),
  ('growth', 'initial_analyses_month', 100, 'included'),
  ('growth', 'reanalyses_month', 50, 'included'),
  ('growth', 'watchlist_accounts', 50, 'included'),
  ('growth', 'pdf_exports_month', 50, 'included'),
  ('growth', 'outreach_generations_month', 100, 'included'),
  ('growth', 'batch_actions_month', 50, 'included'),
  ('growth', 'enrichment_runs_month', 25, 'included'),
  ('growth', 'max_accounts_per_segment', 100, 'included'),
  ('growth', 'comparisons_month', 30, 'included'),
  ('agency', 'active_accounts', 500, 'included'),
  ('agency', 'initial_analyses_month', 500, 'included'),
  ('agency', 'reanalyses_month', 250, 'included'),
  ('agency', 'watchlist_accounts', 200, 'included'),
  ('agency', 'pdf_exports_month', 200, 'included'),
  ('agency', 'outreach_generations_month', 500, 'included'),
  ('agency', 'batch_actions_month', 200, 'included'),
  ('agency', 'enrichment_runs_month', 100, 'included'),
  ('agency', 'max_accounts_per_segment', 500, 'included'),
  ('agency', 'comparisons_month', 100, 'included'),
  ('enterprise', 'active_accounts', 99999, 'included'),
  ('enterprise', 'initial_analyses_month', 99999, 'included'),
  ('enterprise', 'reanalyses_month', 99999, 'included'),
  ('enterprise', 'watchlist_accounts', 99999, 'included'),
  ('enterprise', 'pdf_exports_month', 99999, 'included'),
  ('enterprise', 'outreach_generations_month', 99999, 'included'),
  ('enterprise', 'batch_actions_month', 99999, 'included'),
  ('enterprise', 'enrichment_runs_month', 99999, 'included'),
  ('enterprise', 'max_accounts_per_segment', 99999, 'included'),
  ('enterprise', 'comparisons_month', 99999, 'included')
ON CONFLICT (plan_code, metric_key) DO NOTHING;

-- Seed error catalog
INSERT INTO public.account_brief_error_catalog (error_code, error_type, severity, user_message, admin_message, suggested_action) VALUES
  ('DOMAIN_INVALID', 'validation', 'high', 'O domínio introduzido é inválido.', 'Domain failed DNS/format validation', 'Verificar e corrigir o domínio'),
  ('SITE_OFFLINE', 'crawl', 'high', 'O website está offline ou inacessível.', 'HTTP timeout or connection refused', 'Tentar novamente mais tarde'),
  ('ANTI_BOT', 'crawl', 'medium', 'O website bloqueou a análise (proteção anti-bot).', 'Cloudflare/Captcha detected', 'Adicionar URLs manualmente'),
  ('JS_HEAVY', 'crawl', 'medium', 'O website requer JavaScript pesado para carregar.', 'SPA/JS-rendered content not crawlable', 'Considerar análise parcial'),
  ('HOMEPAGE_EMPTY', 'crawl', 'medium', 'A homepage não contém conteúdo significativo.', 'Homepage returned minimal text content', 'Adicionar URLs internas manualmente'),
  ('TIMEOUT_PARTIAL', 'execution', 'medium', 'A análise completou parcialmente (timeout em algumas páginas).', 'Some URLs timed out during crawl', 'Relançar análise ou adicionar URLs'),
  ('CONTENT_WEAK', 'analysis', 'low', 'O conteúdo público é insuficiente para um briefing completo.', 'Less than minimum text threshold', 'Complementar com dados manuais'),
  ('RATE_LIMITED', 'system', 'high', 'Atingiu o limite de pedidos. Tente novamente em breve.', 'Workspace rate limit exceeded', 'Aguardar reset ou fazer upgrade'),
  ('QUOTA_EXCEEDED', 'billing', 'high', 'Atingiu o limite do seu plano para esta ação.', 'Plan quota exhausted for metric', 'Fazer upgrade do plano'),
  ('DUPLICATE_DOMAIN', 'validation', 'low', 'Já existe uma conta com este domínio.', 'Normalized domain match found', 'Abrir conta existente'),
  ('ROBOTS_BLOCKED', 'crawl', 'medium', 'O robots.txt bloqueia a análise deste website.', 'robots.txt disallow for crawler', 'Adicionar URLs permitidas manualmente'),
  ('MULTI_LANGUAGE', 'analysis', 'low', 'O website tem múltiplos idiomas. A análise usou o idioma principal.', 'Multiple languages detected', 'Verificar idioma no briefing')
ON CONFLICT (error_code) DO NOTHING;

-- Seed default score model version
INSERT INTO public.account_brief_score_model_versions (workspace_id, model_name, version_code, config_json, is_active, activated_at)
SELECT w.id, 'default', 'v1.0', '{"weights":{"icp_fit":0.30,"maturity":0.25,"growth":0.25,"personalization":0.20},"thresholds":{"muito_alto":80,"alto":60,"medio":40,"baixo":20}}', true, now()
FROM public.workspaces w
WHERE EXISTS (SELECT 1 FROM public.account_brief_workspaces abw WHERE abw.workspace_id = w.id)
ON CONFLICT (workspace_id, version_code) DO NOTHING;
