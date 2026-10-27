CREATE OR REPLACE FUNCTION public.read_event_catalog(p_workspace_id uuid) RETURNS TABLE(id uuid,event_name text,domain text,entity_type text,source_module text,description text,is_active boolean,version integer,created_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.is_super_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id=auth.uid() AND wm.workspace_id=p_workspace_id AND wm.role::text IN ('owner','admin','agency'))) THEN
  RAISE EXCEPTION 'Sem autorização para consultar o catálogo de eventos' USING ERRCODE='42501';
 END IF;
 -- Prefer the original registry when populated; otherwise use the registry consumed by the live Kernel.
 IF EXISTS (SELECT 1 FROM public.event_registry) THEN
  RETURN QUERY SELECT e.id,e.event_name,e.domain,e.entity_type,e.source_module,e.description,coalesce(e.is_active,false),coalesce(e.version,1),e.created_at FROM public.event_registry e ORDER BY e.domain,e.event_name;
 ELSE
  RETURN QUERY SELECT e.id,e.event_type,e.domain,e.entity_type,e.source_module,e.description,true,1,e.created_at FROM public.kernel_event_registry e WHERE e.status='active' ORDER BY e.domain,e.event_type;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.read_event_catalog(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_event_catalog(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.read_event_catalog(uuid) IS 'Admin-only public projection of the official event catalogue; excludes payload schemas and operational metadata';