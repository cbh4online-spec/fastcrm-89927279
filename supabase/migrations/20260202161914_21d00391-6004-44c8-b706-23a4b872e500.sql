-- Adicionar colunas para os novos dados de proposta
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS scope_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeline_data JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS references_data JSONB DEFAULT '{}';