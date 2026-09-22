-- Não expor dados de sessões de visitantes ao papel anónimo.
DROP POLICY IF EXISTS "storefront_select_own_visitor_session" ON public.store_visitor_sessions;
REVOKE SELECT ON public.store_visitor_sessions FROM anon;
