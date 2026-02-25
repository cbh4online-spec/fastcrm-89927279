
-- ============================================================
-- People Core Object: Evolve contacts table
-- ============================================================

-- 1A. Add missing columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS contact_preferences jsonb NOT NULL DEFAULT '{"email":true,"phone":true,"whatsapp":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS icp_fit_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pare_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_call_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_pain_points jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_recommendations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_risk_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_last_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 1A. Backfill existing data
UPDATE public.contacts SET
  first_name = CASE WHEN name IS NOT NULL THEN split_part(name, ' ', 1) ELSE NULL END,
  last_name = CASE WHEN name IS NOT NULL AND position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1) ELSE NULL END,
  emails = CASE WHEN email IS NOT NULL AND email != '' THEN jsonb_build_array(jsonb_build_object('email', lower(email), 'primary', true, 'type', 'work')) ELSE '[]'::jsonb END,
  phones = CASE WHEN phone IS NOT NULL AND phone != '' THEN jsonb_build_array(jsonb_build_object('number', phone, 'primary', true, 'type', 'mobile')) ELSE '[]'::jsonb END,
  engagement_score = COALESCE(contact_score, 0),
  ai_last_enriched_at = ai_analyzed_at
WHERE first_name IS NULL;

-- 1B. Create contact_audit_log table
CREATE TABLE IF NOT EXISTS public.contact_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

CREATE INDEX IF NOT EXISTS idx_contact_audit_log_workspace ON public.contact_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contact_audit_log_contact ON public.contact_audit_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_audit_log_changed_at ON public.contact_audit_log(contact_id, changed_at DESC);

-- RLS on contact_audit_log
ALTER TABLE public.contact_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_audit" ON public.contact_audit_log
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- 1C. Create audit trigger function
CREATE OR REPLACE FUNCTION public.fn_contact_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  col text;
  old_val jsonb;
  new_val jsonb;
  audit_cols text[] := ARRAY[
    'name','first_name','last_name','email','phone','company','company_id',
    'job_title','entity_type','tax_id','commercial_name',
    'address','city','postal_code','country',
    'client_status','lead_status','abc_category','lead_source','source','assigned_to',
    'payment_conditions','preferred_payment_method','credit_limit','credit_active',
    'icp_fit_score','engagement_score','pare_score',
    'marketing_opt_in','contact_preferences','consent_record',
    'next_followup_at','ai_temperature','notes','tags'
  ];
BEGIN
  -- Auto-update updated_at
  NEW.updated_at := now();
  
  FOREACH col IN ARRAY audit_cols LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', col, col)
      INTO old_val, new_val
      USING OLD, NEW;
    
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.contact_audit_log (workspace_id, contact_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, NEW.updated_by, col, old_val, new_val);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_contact_audit ON public.contacts;

CREATE TRIGGER trg_contact_audit
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_contact_audit_trigger();

-- 1D. Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON public.contacts(workspace_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts(workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_emails_gin ON public.contacts USING GIN (emails);
CREATE INDEX IF NOT EXISTS idx_contacts_phones_gin ON public.contacts USING GIN (phones);
CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields_gin ON public.contacts USING GIN (custom_fields);
CREATE INDEX IF NOT EXISTS idx_contacts_fulltext ON public.contacts USING GIN (
  to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(name, ''))
);

-- 1E. Validation trigger for scores
CREATE OR REPLACE FUNCTION public.fn_contact_validate_scores()
RETURNS TRIGGER AS $$
BEGIN
  NEW.icp_fit_score := GREATEST(0, LEAST(100, NEW.icp_fit_score));
  NEW.engagement_score := GREATEST(0, LEAST(100, NEW.engagement_score));
  NEW.pare_score := GREATEST(0, LEAST(100, NEW.pare_score));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_validate_scores ON public.contacts;

CREATE TRIGGER trg_contact_validate_scores
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_contact_validate_scores();
