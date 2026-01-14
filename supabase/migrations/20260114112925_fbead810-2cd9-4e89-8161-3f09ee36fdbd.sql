-- Criar função SECURITY DEFINER que cria workspace e adiciona o utilizador como owner
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name TEXT,
  p_slug TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter o ID do utilizador atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Inserir o workspace
  INSERT INTO public.workspaces (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_workspace_id;
  
  -- Adicionar o utilizador como owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');
  
  -- Retornar os dados do workspace
  RETURN json_build_object(
    'id', v_workspace_id,
    'name', p_name,
    'slug', p_slug,
    'created_at', NOW()
  );
END;
$$;

-- Dar permissão aos utilizadores autenticados para executar a função
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT, TEXT) TO authenticated;