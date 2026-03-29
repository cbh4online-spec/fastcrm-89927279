
-- ============================================================
-- META MODULE — Phase 1 Schema
-- ============================================================

-- 1. meta_connections: OAuth connections with encrypted tokens
CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'facebook' CHECK (provider IN ('facebook','instagram','meta_ads')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','warning','error','expired','revoked')),
  connection_name text,
  meta_business_id text,
  meta_user_id text,
  token_type text DEFAULT 'page_access_token',
  encrypted_access_token text,
  encrypted_refresh_token text,
  expires_at timestamptz,
  scopes_json jsonb DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  last_healthcheck_at timestamptz,
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','unhealthy','unknown')),
  health_details_json jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_connections_workspace ON public.meta_connections(workspace_id);
CREATE INDEX idx_meta_connections_status ON public.meta_connections(workspace_id, status);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view meta_connections"
  ON public.meta_connections FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can insert meta_connections"
  ON public.meta_connections FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can update meta_connections"
  ON public.meta_connections FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can delete meta_connections"
  ON public.meta_connections FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. meta_assets: Pages, IG accounts, Ad accounts, Lead Forms, Pixels
CREATE TABLE public.meta_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('page','instagram_account','ad_account','lead_form','pixel','dataset')),
  asset_id_external text NOT NULL,
  asset_name text,
  asset_status text DEFAULT 'discovered' CHECK (asset_status IN ('discovered','active','inactive','error','removed')),
  permissions_json jsonb DEFAULT '[]'::jsonb,
  selected_for_use boolean DEFAULT false,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  page_access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, connection_id, asset_type, asset_id_external)
);

CREATE INDEX idx_meta_assets_workspace ON public.meta_assets(workspace_id);
CREATE INDEX idx_meta_assets_connection ON public.meta_assets(connection_id);
CREATE INDEX idx_meta_assets_type ON public.meta_assets(workspace_id, asset_type, selected_for_use);

ALTER TABLE public.meta_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view meta_assets"
  ON public.meta_assets FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can manage meta_assets"
  ON public.meta_assets FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 3. meta_leads: Leads from Lead Ads
CREATE TABLE public.meta_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id text,
  form_id text,
  lead_id_external text,
  campaign_id text,
  adset_id text,
  ad_id text,
  platform text DEFAULT 'facebook' CHECK (platform IN ('facebook','instagram')),
  raw_payload_json jsonb,
  normalized_payload_json jsonb,
  dedupe_key text,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','processed','failed','requeued')),
  contact_id uuid,
  opportunity_id uuid,
  workflow_run_id uuid,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_leads_workspace ON public.meta_leads(workspace_id);
CREATE INDEX idx_meta_leads_status ON public.meta_leads(workspace_id, processing_status);
CREATE INDEX idx_meta_leads_dedupe ON public.meta_leads(workspace_id, dedupe_key);
CREATE INDEX idx_meta_leads_external ON public.meta_leads(lead_id_external);

ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view meta_leads"
  ON public.meta_leads FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role can manage meta_leads"
  ON public.meta_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. meta_webhook_events: Raw webhook log
CREATE TABLE public.meta_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  object_type text,
  event_type text,
  signature_valid boolean DEFAULT false,
  payload_json jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processing','processed','failed','skipped')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_webhook_events_workspace ON public.meta_webhook_events(workspace_id);
CREATE INDEX idx_meta_webhook_events_status ON public.meta_webhook_events(processing_status);
CREATE INDEX idx_meta_webhook_events_created ON public.meta_webhook_events(created_at DESC);

ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view meta_webhook_events"
  ON public.meta_webhook_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role can manage meta_webhook_events"
  ON public.meta_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. meta_lead_field_mappings: Configurable field mapping
CREATE TABLE public.meta_lead_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  form_id text,
  meta_field_name text NOT NULL,
  crm_field_name text NOT NULL,
  crm_entity text NOT NULL DEFAULT 'contact' CHECK (crm_entity IN ('contact','lead','company','opportunity')),
  transform_rule text DEFAULT 'direct' CHECK (transform_rule IN ('direct','phone_normalize','email_lowercase','name_capitalize','custom')),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, form_id, meta_field_name)
);

ALTER TABLE public.meta_lead_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage meta_lead_field_mappings"
  ON public.meta_lead_field_mappings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 6. meta_module_config: per-workspace config
CREATE TABLE public.meta_module_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  feature_flags_json jsonb DEFAULT '{"connect": true, "leads": true, "inbox": true, "publisher": false, "comments": false, "ads": false, "signals": false}'::jsonb,
  limits_json jsonb DEFAULT '{"max_pages": 5, "max_ig_accounts": 5, "max_forms": 20, "max_messages_month": 10000, "max_leads_month": 5000}'::jsonb,
  preferences_json jsonb DEFAULT '{}'::jsonb,
  auto_create_opportunity boolean DEFAULT false,
  default_lead_owner_id uuid,
  default_pipeline_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_module_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage meta_module_config"
  ON public.meta_module_config FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
