CREATE TABLE public.workspace_supply_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  buyer_workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  origin_label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_workspace_id, buyer_workspace_id),
  CHECK (supplier_workspace_id <> buyer_workspace_id)
);
GRANT SELECT ON public.workspace_supply_links TO authenticated;
GRANT ALL ON public.workspace_supply_links TO service_role;
ALTER TABLE public.workspace_supply_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read supply links" ON public.workspace_supply_links FOR SELECT TO authenticated
USING (supplier_workspace_id IN (SELECT public.get_user_workspace_ids()) OR buyer_workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supply_origin text;

CREATE OR REPLACE FUNCTION public.sync_supplied_product_cost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.base_price IS NOT DISTINCT FROM OLD.base_price THEN RETURN NEW; END IF;
  UPDATE public.products b
     SET direct_cost = NEW.base_price, last_cost = NEW.base_price, last_purchase_date = COALESCE(b.last_purchase_date, CURRENT_DATE), updated_at = now()
    FROM public.workspace_supply_links l
   WHERE b.source_product_id = NEW.id AND l.active
     AND l.supplier_workspace_id = NEW.workspace_id AND l.buyer_workspace_id = b.workspace_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_supplied_product_cost() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_sync_supplied_product_cost AFTER UPDATE OF base_price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_supplied_product_cost();

CREATE OR REPLACE FUNCTION public.apply_supply_link_on_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src record;
BEGIN
  IF NEW.source_product_id IS NULL THEN NEW.supply_origin := NULL; RETURN NEW; END IF;
  SELECT p.base_price, l.origin_label INTO src FROM public.products p
    JOIN public.workspace_supply_links l ON l.supplier_workspace_id = p.workspace_id AND l.buyer_workspace_id = NEW.workspace_id AND l.active
   WHERE p.id = NEW.source_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artigo de origem não pertence a um fornecedor ligado'; END IF;
  NEW.supply_origin := src.origin_label;
  NEW.distributor := src.origin_label;
  NEW.direct_cost := src.base_price;
  NEW.last_cost := src.base_price;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_supply_link_on_product() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_apply_supply_link BEFORE INSERT OR UPDATE OF source_product_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.apply_supply_link_on_product();