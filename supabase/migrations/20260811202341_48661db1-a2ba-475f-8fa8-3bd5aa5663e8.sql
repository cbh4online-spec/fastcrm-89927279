
CREATE OR REPLACE VIEW public.public_workspaces
WITH (security_invoker = false)
AS
SELECT w.id, w.name, w.slug, w.logo_url, w.primary_color, w.secondary_color, w.ui_mode
FROM public.workspaces w;

GRANT SELECT ON public.public_workspaces TO anon, authenticated;
