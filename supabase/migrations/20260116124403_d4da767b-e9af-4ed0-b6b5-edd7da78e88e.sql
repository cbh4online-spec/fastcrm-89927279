-- Add more year columns and tracking for commercial history
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS sales_2023 numeric(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sales_2026 numeric(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commercial_history_updated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commercial_history_updated_by uuid DEFAULT NULL;

-- Add comment explaining fields
COMMENT ON COLUMN public.contacts.sales_2023 IS 'Vendas do ano 2023 - inserção manual';
COMMENT ON COLUMN public.contacts.sales_2024 IS 'Vendas do ano 2024 - inserção manual ou automática';
COMMENT ON COLUMN public.contacts.sales_2025 IS 'Vendas do ano 2025 - inserção manual ou automática';
COMMENT ON COLUMN public.contacts.sales_2026 IS 'Vendas do ano 2026 - inserção manual ou automática';
COMMENT ON COLUMN public.contacts.commercial_history_updated_at IS 'Data da última atualização do histórico comercial';
COMMENT ON COLUMN public.contacts.commercial_history_updated_by IS 'Utilizador que atualizou o histórico comercial';