
-- First fix the broken trigger function
CREATE OR REPLACE FUNCTION public.notify_telegram_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;
  
  IF v_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/telegram-bot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'action', 'sendAlertInternal',
        'workspace_id', NEW.workspace_id,
        'alert_type', 'new_lead',
        'text', '🎯 Novo Lead: ' || COALESCE(NEW.name, 'Sem nome') || E'\n📧 ' || COALESCE(NEW.email, 'N/A') || E'\n🏢 ' || COALESCE(NEW.company_name, 'N/A')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Disable only the user-defined triggers during bulk insert
ALTER TABLE public.leads DISABLE TRIGGER trg_notify_telegram_new_lead;
ALTER TABLE public.leads DISABLE TRIGGER audit_leads;
ALTER TABLE public.leads DISABLE TRIGGER invalidate_lead_cache;
ALTER TABLE public.leads DISABLE TRIGGER log_lead_creation;
ALTER TABLE public.leads DISABLE TRIGGER trigger_log_lead_status_change;

-- Move lead-enricher companies to leads table
INSERT INTO public.leads (
  id, workspace_id, name, email, phone, source, status, lead_type,
  website, industry, company_name, tags, tax_id,
  cae_codes, cae_description, company_status, capital_social,
  founding_date, legal_nature, region, county, parish,
  postal_code, city, address, notes,
  ai_temperature, assigned_to,
  linkedin_url, facebook_url, instagram_url, twitter_url,
  youtube_url, tiktok_url, pinterest_url, whatsapp_url,
  created_at, updated_at
)
SELECT
  c.id, c.workspace_id, c.name, c.email, c.phone, c.source, 'new', 'company',
  c.website, c.industry, c.name, c.tags, c.tax_id,
  c.cae_codes, c.cae_description, c.company_status, c.capital_social,
  c.founding_date, c.legal_nature, c.region, c.county, c.parish,
  c.postal_code, c.city, c.address, c.notes,
  c.ai_temperature, c.assigned_to,
  c.linkedin_url, c.facebook_url, c.instagram_url, c.twitter_url,
  c.youtube_url, c.tiktok_url, c.pinterest_url, c.whatsapp_url,
  c.created_at, c.updated_at
FROM public.companies c
WHERE c.source = 'lead-enricher'
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers
ALTER TABLE public.leads ENABLE TRIGGER trg_notify_telegram_new_lead;
ALTER TABLE public.leads ENABLE TRIGGER audit_leads;
ALTER TABLE public.leads ENABLE TRIGGER invalidate_lead_cache;
ALTER TABLE public.leads ENABLE TRIGGER log_lead_creation;
ALTER TABLE public.leads ENABLE TRIGGER trigger_log_lead_status_change;

-- Delete the migrated companies
DELETE FROM public.companies WHERE source = 'lead-enricher';
