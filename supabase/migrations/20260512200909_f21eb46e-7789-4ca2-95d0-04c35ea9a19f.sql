
CREATE TABLE IF NOT EXISTS public.leadchef_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  promo boolean NOT NULL DEFAULT false,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_leadchef_products_ws ON public.leadchef_products(workspace_id, is_active, sort_order);

ALTER TABLE public.leadchef_products ENABLE ROW LEVEL SECURITY;

-- SELECT: members of workspace
CREATE POLICY "leadchef_products_select_members"
ON public.leadchef_products FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_products.workspace_id
      AND wm.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- INSERT/UPDATE/DELETE: owners/admins or super admin
CREATE POLICY "leadchef_products_insert_admin"
ON public.leadchef_products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_products.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "leadchef_products_update_admin"
ON public.leadchef_products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_products.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "leadchef_products_delete_admin"
ON public.leadchef_products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_products.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER trg_leadchef_products_updated_at
BEFORE UPDATE ON public.leadchef_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial: 10 produtos Bimby para cada workspace existente
INSERT INTO public.leadchef_products (workspace_id, name, points, price, promo, sort_order)
SELECT w.id, p.name, p.points, p.price, p.promo, p.sort_order
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Conj 2 Bimby brush', 2, 32.00::numeric, false, 1),
  ('Mandolina Bimby TM6', 6, 129.00::numeric, false, 2),
  ('Bimby Sensor', 6, 149.00::numeric, false, 3),
  ('Caçarola Bimby', 6, 149.00::numeric, false, 4),
  ('Forma Bimby Universo TM7', 3, 39.00::numeric, false, 5),
  ('2 Protetor de Lâmina e Descascador', 3, 79.80::numeric, true, 6),
  ('Saco transporte sky blue Bimby', 3, 39.00::numeric, false, 7),
  ('Set 6 Ramequins', 3, 40.00::numeric, false, 8),
  ('Conj 8 frascos multiusos', 3, 24.90::numeric, false, 9),
  ('Set Bimby Cutter+ TM7 PT', 8, 159.00::numeric, false, 10)
) AS p(name, points, price, promo, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.leadchef_products lp WHERE lp.workspace_id = w.id
);
