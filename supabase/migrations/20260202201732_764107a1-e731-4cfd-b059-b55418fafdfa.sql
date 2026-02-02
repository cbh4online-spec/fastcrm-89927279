-- Adicionar campos para convite via link partilhável
ALTER TABLE public.client_users
ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índice único para pesquisa rápida por token
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_invite_token 
ON public.client_users(invite_token) 
WHERE invite_token IS NOT NULL;

-- Comentários descritivos
COMMENT ON COLUMN public.client_users.invite_token IS 
  'Token único para convite via link partilhável. NULL após activação.';
COMMENT ON COLUMN public.client_users.invite_expires_at IS 
  'Data de expiração do convite. 7 dias por defeito.';