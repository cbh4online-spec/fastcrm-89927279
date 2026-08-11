
DROP VIEW IF EXISTS public.public_workspaces;

-- Permissão de leitura pública apenas nas colunas de apresentação
GRANT SELECT (id, name, slug, logo_url, primary_color, secondary_color, ui_mode)
  ON public.workspaces TO anon;

CREATE POLICY "Public can read workspace branding"
ON public.workspaces
FOR SELECT
TO anon
USING (true);

CREATE VIEW public.public_workspaces
WITH (security_invoker = true)
AS
SELECT w.id, w.name, w.slug, w.logo_url, w.primary_color, w.secondary_color, w.ui_mode
FROM public.workspaces w;

GRANT SELECT ON public.public_workspaces TO anon, authenticated;
