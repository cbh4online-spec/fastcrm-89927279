-- Permitir NULL na coluna auth_user_id para suportar fluxo de convites B2B
ALTER TABLE public.client_users 
  ALTER COLUMN auth_user_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.client_users.auth_user_id IS 
  'ID do utilizador autenticado. NULL enquanto o convite está pendente.';