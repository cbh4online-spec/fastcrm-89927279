CREATE OR REPLACE FUNCTION public.crm_sync_to_linked_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; tgt uuid; et text; src_label text; comp_tgt uuid; nif text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  et := CASE TG_TABLE_NAME WHEN 'companies' THEN 'company' WHEN 'contacts' THEN 'contact' ELSE 'lead' END;
  FOR l IN SELECT * FROM public.workspace_supply_links WHERE supplier_workspace_id = NEW.workspace_id AND active AND sync_crm LOOP
    src_label := l.origin_label;
    SELECT target_id INTO tgt FROM public.workspace_record_links WHERE link_id = l.id AND entity_type = et AND source_id = NEW.id;

    IF et = 'company' THEN
      nif := NULLIF(btrim(NEW.tax_id),'');
      IF nif IN ('999999990','999999999','000000000') THEN nif := NULL; END IF;
      IF tgt IS NULL AND nif IS NOT NULL THEN
        SELECT id INTO tgt FROM public.companies WHERE workspace_id = l.buyer_workspace_id AND tax_id = nif ORDER BY created_at LIMIT 1;
      END IF;
      IF tgt IS NULL THEN
        INSERT INTO public.companies (workspace_id, name, tax_id, email, phone, notes, address, city, postal_code, country, website, source, tags, created_by)
        VALUES (l.buyer_workspace_id, NEW.name, NEW.tax_id, NEW.email, NEW.phone, NEW.notes, NEW.address, NEW.city, NEW.postal_code, NEW.country, NEW.website, src_label, ARRAY[src_label], NEW.created_by)
        RETURNING id INTO tgt;
      ELSE
        UPDATE public.companies SET
          name = COALESCE(NULLIF(name,''), NEW.name), email = COALESCE(NULLIF(email,''), NEW.email), phone = COALESCE(NULLIF(phone,''), NEW.phone),
          tax_id = COALESCE(NULLIF(tax_id,''), NEW.tax_id), address = COALESCE(NULLIF(address,''), NEW.address), city = COALESCE(NULLIF(city,''), NEW.city),
          postal_code = COALESCE(NULLIF(postal_code,''), NEW.postal_code), country = COALESCE(NULLIF(country,''), NEW.country), website = COALESCE(NULLIF(website,''), NEW.website),
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
        INSERT INTO public.contacts (workspace_id, name, first_name, last_name, email, phone, notes, company_id, tax_id, address, city, postal_code, country, job_title, birth_date, source, tags, created_by)
        VALUES (l.buyer_workspace_id, NEW.name, NEW.first_name, NEW.last_name, NEW.email, NEW.phone, NEW.notes, comp_tgt, NEW.tax_id, NEW.address, NEW.city, NEW.postal_code, NEW.country, NEW.job_title, NEW.birth_date, src_label, ARRAY[src_label], NEW.created_by)
        RETURNING id INTO tgt;
      ELSE
        UPDATE public.contacts SET
          name = COALESCE(NULLIF(name,''), NEW.name), email = COALESCE(NULLIF(email,''), NEW.email), phone = COALESCE(NULLIF(phone,''), NEW.phone),
          company_id = COALESCE(company_id, comp_tgt), tax_id = COALESCE(NULLIF(tax_id,''), NEW.tax_id),
          address = COALESCE(NULLIF(address,''), NEW.address), city = COALESCE(NULLIF(city,''), NEW.city), postal_code = COALESCE(NULLIF(postal_code,''), NEW.postal_code),
          country = COALESCE(NULLIF(country,''), NEW.country), job_title = COALESCE(NULLIF(job_title,''), NEW.job_title), birth_date = COALESCE(birth_date, NEW.birth_date),
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
        UPDATE public.leads SET
          name = COALESCE(NULLIF(name,''), NEW.name), email = COALESCE(NULLIF(email,''), NEW.email), phone = COALESCE(NULLIF(phone,''), NEW.phone),
          company_name = COALESCE(NULLIF(company_name,''), NEW.company_name), tax_id = COALESCE(NULLIF(tax_id,''), NEW.tax_id),
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