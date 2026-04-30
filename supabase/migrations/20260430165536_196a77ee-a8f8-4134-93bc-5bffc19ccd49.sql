-- Garantir que nenhum outro workspace está marcado como gateway
ALTER TABLE public.workspaces DISABLE TRIGGER trg_enforce_payment_gateway_admin;

UPDATE public.workspaces SET is_payment_gateway = false WHERE is_payment_gateway = true;

UPDATE public.workspaces
   SET is_payment_gateway = true
 WHERE id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f';

ALTER TABLE public.workspaces ENABLE TRIGGER trg_enforce_payment_gateway_admin;