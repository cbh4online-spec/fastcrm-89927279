
ALTER TABLE public.c2c_livestreams 
ADD COLUMN IF NOT EXISTS workspace_slug text;

-- Preencher retroactivamente
UPDATE public.c2c_livestreams l
SET workspace_slug = w.slug
FROM public.workspaces w
WHERE l.workspace_id = w.id AND l.workspace_slug IS NULL;

-- Trigger para manter sincronizado em novos inserts
CREATE OR REPLACE FUNCTION public.set_livestream_workspace_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT slug INTO NEW.workspace_slug FROM public.workspaces WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_livestream_workspace_slug
BEFORE INSERT ON public.c2c_livestreams
FOR EACH ROW EXECUTE FUNCTION public.set_livestream_workspace_slug();
