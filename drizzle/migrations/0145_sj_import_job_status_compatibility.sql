CREATE OR REPLACE FUNCTION public.sj_import_historical_rows(_workspace_id uuid, _cohort_id uuid, _batch jsonb, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE
  v_course uuid; v_job uuid; r jsonb; cls jsonb; res jsonb; i int := 0;
  v_label text := nullif(trim(left(_batch->>'source_label',120)),'');
  v_hash text := lower(nullif(_batch->>'file_hash',''));
  v_file text := left(_batch->>'file_name',255);
  v_sheet text := left(coalesce(_batch->>'sheet_name',''),120);
  v_contact uuid; v_profile uuid; v_enr uuid; v_cells jsonb; v_row text; v_lbl text;
  v_ped text; v_fin text; v_adm text; v_amt numeric; v_legacy uuid[]; v_dec_legacy text; v_tmp uuid; v_date date;
  o record; v_changes jsonb;
  e_existing int := 0; e_updated int := 0;
  pend jsonb := '[]'::jsonb; errs jsonb := '[]'::jsonb;
  c_created int; p_created int; e_created int; e_linked int;
BEGIN
  IF public.sj_import_is_manager(_workspace_id) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão para importar históricos'; END IF;
  IF v_label IS NULL THEN RAISE EXCEPTION 'Etiqueta de origem obrigatória'; END IF;
  IF v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Hash do ficheiro inválido'; END IF;
  IF jsonb_typeof(_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(_rows) > 500 THEN RAISE EXCEPTION 'Máximo 500 linhas por pedido'; END IF;
  SELECT c.course_id INTO v_course FROM public.sj_cohorts c WHERE c.id=_cohort_id AND c.workspace_id=_workspace_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'Edição inválida para esta organização'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sj_import:' || _workspace_id::text, 0));
  PERFORM set_config('sj.historical_import', 'on', true);

  INSERT INTO public.sj_import_jobs (workspace_id, source, status, file_name, total_rows, created_by, started_at, mapping_config)
  VALUES (_workspace_id, 'xlsx', 'processing', v_file, jsonb_array_length(_rows), auth.uid(), now(),
    jsonb_build_object('cohort_id',_cohort_id,'source_label',v_label,'file_hash',v_hash,'sheet_name',v_sheet,'version',3))
  RETURNING id INTO v_job;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    i := i + 1; r := r - 'decision'; v_row := left(coalesce(nullif(r->>'source_row',''), i::text),40);
    r := jsonb_set(r, '{source_row}', to_jsonb(v_row));
    BEGIN
      v_lbl := public.sj_import_label_check(_workspace_id, _cohort_id, v_course, r->'labels');
      IF v_lbl <> 'ok' THEN pend := pend || jsonb_build_object('row',v_row,'reason',v_lbl); CONTINUE; END IF;

      cls := public.sj_import_classify(_workspace_id, r, v_hash, v_sheet);
      res := public.sj_import_resolve_row(_workspace_id, v_hash, v_sheet, r, cls);
      IF res ? 'pending' THEN pend := pend || jsonb_build_object('row',v_row,'reason',res->>'pending'); CONTINUE; END IF;

      v_cells := CASE WHEN jsonb_typeof(r->'cells')='object' AND length((r->'cells')::text) < 8000 THEN r->'cells' ELSE '{}'::jsonb END;

      IF res->>'contact' = 'new' THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(cls->'contacts') x WHERE (x->'matched_by') <> '["name_hint"]'::jsonb)
           OR (jsonb_array_length(cls->'contacts') > 0 AND res->>'decision_id' IS NULL) THEN
          RAISE EXCEPTION 'PENDING:contact_candidates_exist'; END IF;
        INSERT INTO public.contacts (workspace_id, created_by, name, email, phone, tax_id, client_number, source, lead_source)
        VALUES (_workspace_id, auth.uid(), left(trim(r->>'full_name'),200), cls->'normalized'->>'email',
          CASE WHEN cls->'normalized'->>'phone' IS NOT NULL THEN left(trim(r->>'phone'),60) END,
          cls->'normalized'->>'nif', cls->'normalized'->>'client_number', v_label, v_label)
        RETURNING id INTO v_contact;
        INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'contact',v_contact,'created',auth.uid()) ON CONFLICT DO NOTHING;
      ELSE
        SELECT c.id INTO v_contact FROM public.contacts c WHERE c.id=(res->>'contact')::uuid AND c.workspace_id=_workspace_id AND c.deleted_at IS NULL FOR UPDATE;
        IF v_contact IS NULL THEN RAISE EXCEPTION 'Contacto escolhido não pertence a esta organização'; END IF;
        INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'contact',v_contact,'reused',auth.uid()) ON CONFLICT DO NOTHING;
      END IF;

      IF res->>'profile' = 'new' THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(cls->'profiles') x WHERE NOT coalesce((x->>'name_only')::boolean,false))
           OR (jsonb_array_length(cls->'profiles') > 0 AND res->>'decision_id' IS NULL) OR EXISTS (SELECT 1 FROM public.sj_profiles p WHERE p.workspace_id=_workspace_id AND p.contact_id=v_contact) THEN
          RAISE EXCEPTION 'PENDING:profile_candidates_exist'; END IF;
        INSERT INTO public.sj_profiles (workspace_id, contact_id, full_name, email, phone, lifecycle_stage, source)
        VALUES (_workspace_id, v_contact, left(trim(r->>'full_name'),200), cls->'normalized'->>'email',
          CASE WHEN cls->'normalized'->>'phone' IS NOT NULL THEN left(trim(r->>'phone'),60) END, 'enrolled', 'historical_import')
        RETURNING id INTO v_profile;
        INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'created',auth.uid()) ON CONFLICT DO NOTHING;
      ELSE
        v_profile := public.sj_canonical_profile(_workspace_id, (res->>'profile')::uuid);
        IF v_profile IS NULL THEN RAISE EXCEPTION 'Perfil escolhido inválido'; END IF;
        PERFORM 1 FROM public.sj_profiles p WHERE p.id=v_profile AND p.workspace_id=_workspace_id AND p.archived_at IS NULL FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Perfil escolhido inválido ou arquivado'; END IF;
        SELECT p.contact_id INTO v_tmp FROM public.sj_profiles p WHERE p.id=v_profile;
        IF v_tmp IS NULL THEN
          IF EXISTS (SELECT 1 FROM public.sj_profiles p WHERE p.workspace_id=_workspace_id AND p.contact_id=v_contact AND p.id<>v_profile) THEN
            RAISE EXCEPTION 'PENDING:contact_has_other_profile'; END IF;
          UPDATE public.sj_profiles SET contact_id = v_contact WHERE id = v_profile AND workspace_id=_workspace_id;
          INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
          VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'linked',auth.uid()) ON CONFLICT DO NOTHING;
        ELSIF v_tmp <> v_contact THEN RAISE EXCEPTION 'PENDING:profile_linked_to_other_contact';
        ELSE
          INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
          VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'reused',auth.uid()) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      v_ped := coalesce(nullif(r->>'pedagogic_status',''),'not_started');
      IF v_ped NOT IN ('not_started','in_training','completed','not_completed','withdrawn') THEN v_ped := 'not_started'; END IF;
      v_date := CASE WHEN (r->>'completed_at') ~ '^\d{4}-\d{2}-\d{2}$' THEN (r->>'completed_at')::date END;

      SELECT e.id INTO v_enr FROM public.sj_enrollments e WHERE e.workspace_id=_workspace_id AND e.profile_id=v_profile AND e.cohort_id=_cohort_id
        ORDER BY e.created_at LIMIT 1;
      IF v_enr IS NULL THEN
        PERFORM 1 FROM public.sj_enrollments e WHERE e.workspace_id=_workspace_id AND e.profile_id=v_profile AND e.course_id=v_course AND e.cohort_id IS NULL FOR UPDATE;
        v_legacy := ARRAY(SELECT e.id FROM public.sj_enrollments e WHERE e.workspace_id=_workspace_id AND e.profile_id=v_profile AND e.course_id=v_course
          AND e.cohort_id IS NULL AND coalesce(e.admin_status,'') <> 'cancelled');
        v_dec_legacy := CASE WHEN res->>'decision_cohort' = _cohort_id::text THEN res->>'legacy' END;
        IF cardinality(v_legacy) > 0 THEN
          IF v_dec_legacy IS NULL THEN RAISE EXCEPTION 'PENDING:legacy_enrollment_needs_decision'; END IF;
          IF v_dec_legacy <> 'separate' THEN
            IF NOT (v_dec_legacy::uuid = ANY(v_legacy)) THEN RAISE EXCEPTION 'PENDING:legacy_choice_not_candidate'; END IF;
            UPDATE public.sj_enrollments SET cohort_id = _cohort_id WHERE id = v_dec_legacy::uuid AND workspace_id=_workspace_id;
            v_enr := v_dec_legacy::uuid;
            INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by,changes)
            VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_enr,'linked',auth.uid(),
              jsonb_build_object('cohort_id',jsonb_build_object('from',NULL,'to',_cohort_id),'decision_id',res->>'decision_id')) ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END IF;

      IF v_enr IS NOT NULL THEN
        SELECT e.pedagogic_status, e.status, e.completed_at, e.admin_status INTO o FROM public.sj_enrollments e WHERE e.id=v_enr AND e.workspace_id=_workspace_id FOR UPDATE;
        v_changes := NULL;
        IF v_ped = 'completed' AND o.pedagogic_status IS DISTINCT FROM 'completed' THEN
          IF o.pedagogic_status = 'withdrawn' OR o.status = 'dropped' OR o.admin_status = 'cancelled' THEN
            RAISE EXCEPTION 'PENDING:existing_status_conflict'; END IF;
          PERFORM set_config('sj.historical_import_target', v_enr::text, true);
          UPDATE public.sj_enrollments SET pedagogic_status='completed', status='completed', completed_at = coalesce(completed_at, v_date::timestamptz)
           WHERE id=v_enr AND workspace_id=_workspace_id;
          PERFORM set_config('sj.historical_import_target', '', true);
          v_changes := jsonb_build_object('pedagogic_status',jsonb_build_object('from',o.pedagogic_status,'to','completed'),
            'status',jsonb_build_object('from',o.status,'to','completed'),
            'completed_at',jsonb_build_object('from',o.completed_at,'to',coalesce(o.completed_at, v_date::timestamptz)));
          e_updated := e_updated + 1;
        END IF;
        e_existing := e_existing + 1;
        INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by,changes)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_enr,'evidence',auth.uid(),v_changes) ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      v_adm := CASE WHEN v_ped='completed' THEN 'admin_completed' WHEN v_ped='withdrawn' THEN 'cancelled' ELSE 'confirmed' END;
      v_fin := nullif(r->>'financial_status','');
      IF v_fin IS NOT NULL AND v_fin NOT IN ('unpaid','paid','partial','refunded','waived') THEN v_fin := NULL; END IF;
      v_amt := CASE WHEN (r->>'agreed_amount') ~ '^\d+(\.\d{1,2})?$' THEN (r->>'agreed_amount')::numeric END;

      INSERT INTO public.sj_enrollments (workspace_id, profile_id, course_id, cohort_id, source, status, payment_status,
        admin_status, pedagogic_status, financial_status, financial_unknown, agreed_amount, base_amount, completed_at, notes,
        import_source_file, import_source_sheet, import_source_row)
      VALUES (_workspace_id, v_profile, v_course, _cohort_id, 'import',
        CASE WHEN v_ped='completed' THEN 'completed' WHEN v_ped='withdrawn' THEN 'dropped' ELSE 'enrolled' END,
        CASE WHEN v_fin IN ('unpaid','paid','partial','refunded') THEN v_fin ELSE 'unknown' END,
        v_adm, v_ped, v_fin, (v_fin IS NULL AND v_amt IS NULL), v_amt, v_amt,
        CASE WHEN v_ped='completed' THEN v_date::timestamptz END,
        nullif(left(r->>'notes',1000),''), v_file, v_sheet, v_row)
      RETURNING id INTO v_enr;
      INSERT INTO public.sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
      VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_enr,'created',auth.uid()) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('sj.historical_import_target', '', true);
      IF SQLERRM LIKE 'PENDING:%' THEN pend := pend || jsonb_build_object('row',v_row,'reason',substr(SQLERRM,9));
      ELSE errs := errs || jsonb_build_object('row',v_row,'error',SQLERRM); END IF;
    END;
  END LOOP;

  SELECT count(*) FILTER (WHERE entity_type='contact' AND action='created'), count(*) FILTER (WHERE entity_type='profile' AND action='created'),
         count(*) FILTER (WHERE entity_type='enrollment' AND action='created'), count(*) FILTER (WHERE entity_type='enrollment' AND action='linked')
    INTO c_created, p_created, e_created, e_linked FROM public.sj_import_provenance WHERE job_id = v_job;

  UPDATE public.sj_import_jobs SET status='done', completed_at=now(), processed_rows=i, success_count=e_created+e_linked,
    skipped_count=jsonb_array_length(pend), error_count=jsonb_array_length(errs), errors=errs,
    results_summary=jsonb_build_object('contacts_created',c_created,'profiles_created',p_created,'enrollments_created',e_created,
      'enrollments_linked',e_linked,'enrollments_existing',e_existing,'enrollments_completed_by_evidence',e_updated,'pending',pend)
  WHERE id=v_job;
  PERFORM set_config('sj.historical_import', 'off', true);
  RETURN jsonb_build_object('job_id',v_job,'contacts_created',c_created,'profiles_created',p_created,'enrollments_created',e_created,
    'enrollments_linked',e_linked,'enrollments_existing',e_existing,'enrollments_completed_by_evidence',e_updated,'pending',pend,'errors',errs);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_historical_rows(uuid,uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_import_historical_rows(uuid,uuid,jsonb,jsonb) TO authenticated;