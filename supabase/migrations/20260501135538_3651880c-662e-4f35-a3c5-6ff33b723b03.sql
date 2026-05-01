CREATE OR REPLACE FUNCTION public.can_manage_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.user_id = _user_id
        AND wm.workspace_id = _workspace_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces target_ws
      JOIN public.workspace_members agency_member
        ON agency_member.workspace_id = target_ws.managed_by_workspace_id
      WHERE target_ws.id = _workspace_id
        AND agency_member.user_id = _user_id
        AND agency_member.role IN ('owner', 'admin', 'agency')
    );
$$;

CREATE OR REPLACE FUNCTION public.validate_product_image_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = NEW.product_id
      AND p.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Product image must belong to a product in the same workspace';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_image_workspace_trigger ON public.product_images;
CREATE TRIGGER validate_product_image_workspace_trigger
BEFORE INSERT OR UPDATE OF workspace_id, product_id ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_image_workspace();

DROP POLICY IF EXISTS "Users can view product images in their workspace" ON public.product_images;
DROP POLICY IF EXISTS "Users can create product images in their workspace" ON public.product_images;
DROP POLICY IF EXISTS "Users can update product images in their workspace" ON public.product_images;
DROP POLICY IF EXISTS "Users can delete product images in their workspace" ON public.product_images;
DROP POLICY IF EXISTS "Product images can be viewed by workspace managers" ON public.product_images;
DROP POLICY IF EXISTS "Product images can be created by workspace managers" ON public.product_images;
DROP POLICY IF EXISTS "Product images can be updated by workspace managers" ON public.product_images;
DROP POLICY IF EXISTS "Product images can be deleted by workspace managers" ON public.product_images;

CREATE POLICY "Product images can be viewed by workspace managers"
ON public.product_images
FOR SELECT
TO authenticated
USING (
  public.can_manage_workspace(auth.uid(), workspace_id)
);

CREATE POLICY "Product images can be created by workspace managers"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_workspace(auth.uid(), workspace_id)
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.workspace_id = workspace_id
  )
);

CREATE POLICY "Product images can be updated by workspace managers"
ON public.product_images
FOR UPDATE
TO authenticated
USING (
  public.can_manage_workspace(auth.uid(), workspace_id)
)
WITH CHECK (
  public.can_manage_workspace(auth.uid(), workspace_id)
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.workspace_id = workspace_id
  )
);

CREATE POLICY "Product images can be deleted by workspace managers"
ON public.product_images
FOR DELETE
TO authenticated
USING (
  public.can_manage_workspace(auth.uid(), workspace_id)
);