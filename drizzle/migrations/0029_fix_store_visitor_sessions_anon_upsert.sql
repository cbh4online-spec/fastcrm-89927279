-- Permitir upsert anónimo (INSERT ... ON CONFLICT DO UPDATE) das sessões de visitantes da loja.
-- O upsert exige políticas INSERT e UPDATE (USING + WITH CHECK) para o papel anon/authenticated.

GRANT SELECT, INSERT, UPDATE ON public.store_visitor_sessions TO anon, authenticated;
GRANT ALL ON public.store_visitor_sessions TO service_role;

DROP POLICY IF EXISTS "Allow anonymous insert" ON public.store_visitor_sessions;
DROP POLICY IF EXISTS "Allow anonymous update own session" ON public.store_visitor_sessions;

CREATE POLICY "storefront_insert_visitor_session"
ON public.store_visitor_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (workspace_id IS NOT NULL);

CREATE POLICY "storefront_update_visitor_session"
ON public.store_visitor_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (workspace_id IS NOT NULL);

-- O upsert com ON CONFLICT precisa de ler a linha em conflito.
CREATE POLICY "storefront_select_own_visitor_session"
ON public.store_visitor_sessions
FOR SELECT
TO anon
USING (true);
