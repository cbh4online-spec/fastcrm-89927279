-- Remover índice parcial existente que não funciona com upsert
DROP INDEX IF EXISTS idx_leads_ghl_contact_unique;

-- Criar uma constraint única real que o Supabase pode usar com onConflict
ALTER TABLE leads ADD CONSTRAINT leads_ghl_contact_unique 
  UNIQUE (workspace_id, ghl_contact_id);