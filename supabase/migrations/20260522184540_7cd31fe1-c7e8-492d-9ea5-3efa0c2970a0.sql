ALTER TABLE public.company_financing
  DROP CONSTRAINT IF EXISTS company_financing_documentation_status_check;

UPDATE public.company_financing SET documentation_status = 'aprovado' WHERE documentation_status = 'ok';

ALTER TABLE public.company_financing
  ADD CONSTRAINT company_financing_documentation_status_check
  CHECK (documentation_status IN ('pendente','aprovado','recusado'));