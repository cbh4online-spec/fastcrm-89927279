CREATE OR REPLACE FUNCTION public.get_public_store_category_tree(p_workspace_id uuid)
RETURNS TABLE (id uuid, workspace_id uuid, name text, slug text, description text, parent_id uuid, "position" integer, store_visible boolean, image_url text, color text, icon text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pc.id, pc.workspace_id, pc.name, pc.slug, pc.description, pc.parent_id, pc.position, pc.store_visible, pc.image_url, pc.color, pc.icon
  FROM public.product_categories pc
  WHERE pc.workspace_id = p_workspace_id
    AND pc.is_active = true
    AND (
      pc.store_visible = true
      -- Ajax: árvore completa autorizada (categorias já eram públicas)
      OR pc.workspace_id = '1d208cbe-3285-45d0-8d9e-7d2bd6e9b2d6'::uuid
      -- Membros do próprio workspace mantêm acesso aos ramos ocultos
      OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = pc.workspace_id AND wm.user_id = auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  ORDER BY pc.position NULLS LAST, pc.name;
$$;
REVOKE ALL ON FUNCTION public.get_public_store_category_tree(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_category_tree(uuid) TO anon, authenticated, service_role;