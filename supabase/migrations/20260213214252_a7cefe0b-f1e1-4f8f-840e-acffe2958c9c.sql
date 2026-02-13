
-- Correcao 1: Adicionar status "pending" ao ciclo de vida das conversas
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check 
  CHECK (status IN ('open', 'closed', 'pending', 'archived'));
