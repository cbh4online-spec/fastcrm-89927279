-- Hardening da tabela public.ambassadors: iban/nif nunca acessíveis via Data API.

-- 1. Fechar tudo primeiro
REVOKE ALL ON public.ambassadors FROM anon, authenticated;

-- 2. Grants por coluna (iban e nif ficam de fora de propósito)
GRANT SELECT (
  id, user_id, full_name, email, phone, slug, current_tier,
  monthly_revenue_generated, lifetime_revenue_generated,
  total_earned, total_paid, available_balance,
  active_referrals_count, is_active, notes, created_at, updated_at
) ON public.ambassadors TO authenticated;

GRANT INSERT (
  id, user_id, full_name, email, phone, slug, iban, nif, is_active, notes
) ON public.ambassadors TO authenticated;

GRANT UPDATE (
  full_name, email, phone, slug, iban, nif, is_active, notes
) ON public.ambassadors TO authenticated;

GRANT ALL ON public.ambassadors TO service_role;

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- 3. Super admin deixa de ter leitura livre da linha inteira: mantém-se a
--    política, mas as colunas sensíveis já não são selecionáveis por ninguém
--    através da API (nem pelo próprio, nem por super admin).

-- 4. Acesso legítimo do próprio embaixador aos seus dados bancários
CREATE OR REPLACE FUNCTION public.get_my_ambassador_banking()
RETURNS TABLE (iban text, nif text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.iban, a.nif
  FROM public.ambassadors a
  WHERE a.user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_ambassador_banking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_ambassador_banking() TO authenticated;