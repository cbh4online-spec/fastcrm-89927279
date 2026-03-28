
ALTER TABLE public.renewal_contracts ADD COLUMN IF NOT EXISTS dunning_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS renewal_contract_id uuid REFERENCES public.renewal_contracts(id) ON DELETE SET NULL;
