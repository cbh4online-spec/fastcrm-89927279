DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','product_tags','product_ai_commerce','product_spec_attributes','product_relations','product_bundles','leads','contacts','companies','mymia_crm_sync_runs','mymia_crm_sync_logs'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;