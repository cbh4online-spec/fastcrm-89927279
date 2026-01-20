-- Adicionar plataforma aos perfis de prospecção
ALTER TABLE professional_prospecting_profiles 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'instagram';

-- Adicionar plataformas pesquisadas ao registo de pesquisa
ALTER TABLE professional_prospecting_searches
ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT ARRAY['instagram'];