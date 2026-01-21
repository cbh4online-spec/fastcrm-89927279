-- Adicionar coluna para marcar se o workspace requer onboarding
ALTER TABLE workspace_onboarding 
ADD COLUMN IF NOT EXISTS requires_onboarding boolean DEFAULT true;

-- Adicionar coluna para indicar se foi criado por admin
ALTER TABLE workspace_onboarding 
ADD COLUMN IF NOT EXISTS created_by_admin uuid REFERENCES auth.users(id);

-- Comentário
COMMENT ON COLUMN workspace_onboarding.requires_onboarding IS 'Se true, utilizador será redirecionado para onboarding no primeiro login';
COMMENT ON COLUMN workspace_onboarding.created_by_admin IS 'ID do super admin que criou este workspace/utilizador';