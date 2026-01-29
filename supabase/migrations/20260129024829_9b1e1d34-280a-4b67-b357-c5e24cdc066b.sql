-- Create unique partial index for GHL contact sync upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ghl_contact_unique 
ON public.leads (workspace_id, ghl_contact_id) 
WHERE ghl_contact_id IS NOT NULL;