
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique 
  ON leads (workspace_id, email) 
  WHERE email IS NOT NULL AND email != '';
