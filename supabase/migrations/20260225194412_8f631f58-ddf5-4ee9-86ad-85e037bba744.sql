
-- =============================================
-- Companies Core Object Migration
-- =============================================

-- 1A. Add missing columns to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year int;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue_range text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS funding_amount numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_model text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS connection_strength text DEFAULT 'neutral';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS icp_fit_score int NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pare_score int NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_value_estimate numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS estimated_ltv numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_use_case text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS decision_maker_role text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'medium';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_pain_points jsonb DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_opportunities jsonb DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_risk_flags jsonb DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_last_enriched_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS associated_workspaces uuid[] DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 1B. Data backfill
-- Extract domain from website
UPDATE companies
SET domain = lower(regexp_replace(
  regexp_replace(website, '^https?://(www\.)?', ''),
  '/.*$', ''
))
WHERE website IS NOT NULL AND website != '' AND domain IS NULL;

-- Copy ai_analyzed_at to ai_last_enriched_at
UPDATE companies SET ai_last_enriched_at = ai_analyzed_at WHERE ai_analyzed_at IS NOT NULL AND ai_last_enriched_at IS NULL;

-- 1C. Create companies_audit_log table
CREATE TABLE IF NOT EXISTS companies_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

CREATE INDEX IF NOT EXISTS idx_companies_audit_log_workspace ON companies_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_audit_log_company ON companies_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_audit_log_changed_at ON companies_audit_log(changed_at DESC);

-- RLS on companies_audit_log
ALTER TABLE companies_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view company audit logs"
  ON companies_audit_log FOR SELECT
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- 1D. Audit trigger
CREATE OR REPLACE FUNCTION fn_companies_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _field text;
  _fields text[] := ARRAY[
    'name','legal_name','domain','description','industry','company_status',
    'categories','tags','website','linkedin_url','facebook_url','twitter_url',
    'size','annual_revenue_range','funding_amount','business_model',
    'country','address','timezone','connection_strength',
    'icp_fit_score','pare_score','account_value_estimate','estimated_ltv',
    'primary_use_case','decision_maker_role','priority_level',
    'ai_summary','ai_tags','ai_pain_points','ai_opportunities','ai_risk_flags',
    'phone','email','tax_id','payment_conditions','credit_limit','credit_active'
  ];
BEGIN
  NEW.updated_at := now();
  
  FOREACH _field IN ARRAY _fields LOOP
    IF to_jsonb(NEW) ->> _field IS DISTINCT FROM to_jsonb(OLD) ->> _field THEN
      INSERT INTO companies_audit_log (workspace_id, company_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, NEW.updated_by, _field, to_jsonb(OLD) -> _field, to_jsonb(NEW) -> _field);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_companies_audit ON companies;
CREATE TRIGGER trg_companies_audit
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION fn_companies_audit_trigger();

-- 1E. Score validation trigger
CREATE OR REPLACE FUNCTION fn_companies_clamp_scores()
RETURNS TRIGGER AS $$
BEGIN
  NEW.icp_fit_score := GREATEST(0, LEAST(100, COALESCE(NEW.icp_fit_score, 0)));
  NEW.pare_score := GREATEST(0, LEAST(100, COALESCE(NEW.pare_score, 0)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_clamp_scores ON companies;
CREATE TRIGGER trg_companies_clamp_scores
  BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION fn_companies_clamp_scores();

-- 1F. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_workspace_domain_unique
  ON companies (workspace_id, lower(domain))
  WHERE domain IS NOT NULL AND domain != '';

CREATE INDEX IF NOT EXISTS idx_companies_categories_gin ON companies USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_companies_ai_tags_gin ON companies USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_companies_custom_fields_gin ON companies USING GIN (custom_fields);
CREATE INDEX IF NOT EXISTS idx_companies_workspace_status ON companies (workspace_id, company_status);
CREATE INDEX IF NOT EXISTS idx_companies_workspace_deleted ON companies (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_companies_fulltext ON companies USING GIN (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(industry,''))
);
