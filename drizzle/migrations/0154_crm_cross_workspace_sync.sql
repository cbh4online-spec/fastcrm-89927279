ALTER TABLE public.workspace_supply_links ADD COLUMN IF NOT EXISTS sync_crm boolean NOT NULL DEFAULT false;

CREATE TABLE public.workspace_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.workspace_supply_links(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company','contact','lead')),
  source_id uuid NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (link_id, entity_type, source_id)
);
GRANT SELECT ON public.workspace_record_links TO authenticated;
GRANT ALL ON public.workspace_record_links TO service_role;
ALTER TABLE public.workspace_record_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read record links" ON public.workspace_record_links FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_supply_links l WHERE l.id = link_id AND (l.supplier_workspace_id IN (SELECT public.get_user_workspace_ids()) OR l.buyer_workspace_id IN (SELECT public.get_user_workspace_ids()))) OR (SELECT public.is_super_admin(auth.uid())));

CREATE OR REPLACE FUNCTION public.crm_sync_to_linked_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; tgt uuid; et text; src_label text; comp_tgt uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  et := CASE TG_TABLE_NAME WHEN 'companies' THEN 'company' WHEN 'contacts' THEN 'contact' ELSE 'lead' END;
  FOR l IN SELECT * FROM public.workspace_supply_links WHERE supplier_workspace_id = NEW.workspace_id AND active AND sync_crm LOOP
    src_label := l.origin_label;
    SELECT target_id INTO tgt FROM public.workspace_record_links WHERE link_id = l.id AND entity_type = et AND source_id = NEW.id;

    IF et = 'company' THEN
      IF tgt IS NULL AND NULLIF(NEW.tax_id,'') IS NOT NULL THEN
        SELECT id INTO tgt FROM public.companies WHERE workspace_id = l.buyer_workspace_id AND tax_id = NEW.tax_id ORDER BY created_at LIMIT 1;
      END IF;
      IF tgt IS NULL THEN
        INSERT INTO public.companies (workspace_id, name, tax_id, email, phone, notes, source, tags, created_by)
        VALUES (l.buyer_workspace_id, NEW.name, NEW.tax_id, NEW.email, NEW.phone, NEW.notes, src_label, ARRAY[src_label], NEW.created_by)
        RETURNING id INTO tgt;
      ELSE
        UPDATE public.companies SET name = NEW.name, email = COALESCE(NEW.email, email), phone = COALESCE(NEW.phone, phone),
          tags = CASE WHEN src_label = ANY(COALESCE(tags,'{}')) THEN tags ELSE array_append(COALESCE(tags,'{}'), src_label) END
        WHERE id = tgt;
      END IF;

    ELSIF et = 'contact' THEN
      IF tgt IS NULL THEN
        SELECT id INTO tgt FROM public.contacts WHERE workspace_id = l.buyer_workspace_id AND archived_at IS NULL
          AND ((NULLIF(NEW.email,'') IS NOT NULL AND lower(email) = lower(NEW.email)) OR (NULLIF(NEW.phone,'') IS NOT NULL AND phone = NEW.phone))
          ORDER BY created_at LIMIT 1;
      END IF;
      IF NEW.company_id IS NOT NULL THEN
        SELECT target_id INTO comp_tgt FROM public.workspace_record_links WHERE link_id = l.id AND entity_type = 'company' AND source_id = NEW.company_id;
      END IF;
      IF tgt IS NULL THEN
        INSERT INTO public.contacts (workspace_id, name, first_name, last_name, email, phone, notes, company_id, source, tags, created_by)
        VALUES (l.buyer_workspace_id, NEW.name, NEW.first_name, NEW.last_name, NEW.email, NEW.phone, NEW.notes, comp_tgt, src_label, ARRAY[src_label], NEW.created_by)
        RETURNING id INTO tgt;
      ELSE
        UPDATE public.contacts SET name = NEW.name, email = COALESCE(NEW.email, email), phone = COALESCE(NEW.phone, phone),
          company_id = COALESCE(company_id, comp_tgt),
          tags = CASE WHEN src_label = ANY(COALESCE(tags,'{}')) THEN tags ELSE array_append(COALESCE(tags,'{}'), src_label) END
        WHERE id = tgt;
      END IF;

    ELSE
      IF tgt IS NULL THEN
        SELECT id INTO tgt FROM public.leads WHERE workspace_id = l.buyer_workspace_id
          AND ((NULLIF(NEW.email,'') IS NOT NULL AND lower(email) = lower(NEW.email)) OR (NULLIF(NEW.phone,'') IS NOT NULL AND phone = NEW.phone))
          ORDER BY created_at LIMIT 1;
      END IF;
      IF tgt IS NULL THEN
        INSERT INTO public.leads (workspace_id, name, email, phone, company_name, tax_id, notes, status, lead_type, source, tags)
        VALUES (l.buyer_workspace_id, NEW.name, NEW.email, NEW.phone, NEW.company_name, NEW.tax_id, NEW.notes, NEW.status, NEW.lead_type, src_label, ARRAY[src_label])
        RETURNING id INTO tgt;
      ELSE
        UPDATE public.leads SET name = NEW.name, email = COALESCE(NEW.email, email), phone = COALESCE(NEW.phone, phone),
          tags = CASE WHEN src_label = ANY(COALESCE(tags,'{}')) THEN tags ELSE array_append(COALESCE(tags,'{}'), src_label) END
        WHERE id = tgt;
      END IF;
    END IF;

    INSERT INTO public.workspace_record_links (link_id, entity_type, source_id, target_id)
    VALUES (l.id, et, NEW.id, tgt) ON CONFLICT (link_id, entity_type, source_id) DO NOTHING;
    tgt := NULL; comp_tgt := NULL;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'crm_sync_to_linked_workspace % falhou: %', TG_TABLE_NAME, SQLSTATE;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.crm_sync_to_linked_workspace() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_crm_sync_companies AFTER INSERT OR UPDATE OF name, tax_id, email, phone ON public.companies FOR EACH ROW EXECUTE FUNCTION public.crm_sync_to_linked_workspace();
CREATE TRIGGER trg_crm_sync_contacts AFTER INSERT OR UPDATE OF name, email, phone, company_id ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.crm_sync_to_linked_workspace();
CREATE TRIGGER trg_crm_sync_leads AFTER INSERT OR UPDATE OF name, email, phone ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_sync_to_linked_workspace();