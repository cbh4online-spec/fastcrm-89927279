ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sales_playbook JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.sales_playbook IS
'Procedimento comercial e pós-venda. Estrutura: { script: text, objections: [{ objection, response }], warranty: text, updated_at: timestamptz }';