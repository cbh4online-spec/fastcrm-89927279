ALTER TABLE public.workspace_menu_overrides REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_menu_overrides;