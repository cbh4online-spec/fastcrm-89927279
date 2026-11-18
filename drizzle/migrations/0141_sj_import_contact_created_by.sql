CREATE OR REPLACE FUNCTION public.sj_import_historical_rows(_workspace_id uuid, _cohort_id uuid, _batch jsonb, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_course uuid; v_job uuid; r jsonb; cls jsonb; res jsonb; i int := 0;
  v_label text := nullif(trim(left(_batch->>'source_label',120)),'');
  v_hash text := lower(nullif(_batch->>'file_hash',''));
  v_file text := left(_batch->>'file_name',255);
  v_sheet text := left(coalesce(_batch->>'sheet_name',''),120);
  v_contact uuid; v_profile uuid; v_enr uuid; v_cells jsonb; v_row text;
  v_ped text; v_fin text; v_adm text; v_amt numeric; v_legacy uuid[]; v_dec_legacy text; v_tmp uuid;
  c_created int := 0; c_reused int := 0; p_created int := 0; p_reused int := 0;
  e_created int := 0; e_linked int := 0; e_existing int := 0;
  pend jsonb := '[]'::jsonb; errs jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN
    RAISE EXCEPTION 'Sem permissão para importar históricos'; END IF;
  IF v_label IS NULL THEN RAISE EXCEPTION 'Etiqueta de origem obrigatória'; END IF;
  IF v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Hash do ficheiro inválido'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 500 THEN RAISE EXCEPTION 'Máximo 500 linhas por pedido'; END IF;
  SELECT course_id INTO v_course FROM sj_cohorts WHERE id=_cohort_id AND workspace_id=_workspace_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'Edição inválida para esta organização'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sj_import:' || _workspace_id::text, 0));
  PERFORM set_config('sj.historical_import', 'on', true);

  INSERT INTO sj_import_jobs (workspace_id, source, status, file_name, total_rows, created_by, started_at, mapping_config)
  VALUES (_workspace_id, 'historical_excel', 'processing', v_file, jsonb_array_length(_rows), auth.uid(), now(),
    jsonb_build_object('cohort_id',_cohort_id,'source_label',v_label,'file_hash',v_hash,'sheet_name',v_sheet,'version',2))
  RETURNING id INTO v_job;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    i := i + 1; v_row := left(coalesce(r->>'source_row', i::text),40);
    BEGIN
      cls := public.sj_import_classify(_workspace_id, r, v_hash, v_sheet);
      res := public.sj_import_resolve(cls, coalesce(r->'decision','{}'::jsonb));
      IF res ? 'pending' THEN pend := pend || jsonb_build_object('row',v_row,'reason',res->>'pending'); CONTINUE; END IF;

      IF jsonb_typeof(r->'labels') = 'array' AND jsonb_array_length(r->'labels') > 0 THEN
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(r->'labels') l JOIN sj_import_label_maps m
             ON m.workspace_id=_workspace_id AND m.label_norm=public.sj_norm_text(l) AND m.cohort_id=_cohort_id) THEN
          pend := pend || jsonb_build_object('row',v_row,'reason','label_not_mapped_to_cohort'); CONTINUE;
        END IF;
      END IF;

      v_cells := CASE WHEN jsonb_typeof(r->'cells')='object' AND length((r->'cells')::text) < 8000 THEN r->'cells' ELSE '{}'::jsonb END;

      IF res->>'contact' = 'new' THEN
        INSERT INTO contacts (workspace_id, created_by, name, email, phone, tax_id, client_number, source, lead_source)
        VALUES (_workspace_id, auth.uid(), left(trim(r->>'full_name'),200), cls->'normalized'->>'email',
          CASE WHEN cls->'normalized'->>'phone' IS NOT NULL THEN left(trim(r->>'phone'),60) END,
          cls->'normalized'->>'nif', cls->'normalized'->>'client_number', v_label, v_label)
        RETURNING id INTO v_contact;
        c_created := c_created + 1;
        INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'contact',v_contact,'created',auth.uid()) ON CONFLICT DO NOTHING;
      ELSE
        SELECT id INTO v_contact FROM contacts WHERE id=(res->>'contact')::uuid AND workspace_id=_workspace_id AND deleted_at IS NULL FOR UPDATE;
        IF v_contact IS NULL THEN RAISE EXCEPTION 'Contacto escolhido não pertence a esta organização'; END IF;
        c_reused := c_reused + 1;
        INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'contact',v_contact,'reused',auth.uid()) ON CONFLICT DO NOTHING;
      END IF;

      IF res->>'profile' = 'new' THEN
        IF EXISTS (SELECT 1 FROM sj_profiles WHERE workspace_id=_workspace_id AND contact_id=v_contact) THEN
          RAISE EXCEPTION 'O contacto já tem perfil — reveja a linha'; END IF;
        INSERT INTO sj_profiles (workspace_id, contact_id, full_name, email, phone, lifecycle_stage, source)
        VALUES (_workspace_id, v_contact, left(trim(r->>'full_name'),200), cls->'normalized'->>'email',
          CASE WHEN cls->'normalized'->>'phone' IS NOT NULL THEN left(trim(r->>'phone'),60) END, 'enrolled', 'historical_import')
        RETURNING id INTO v_profile;
        p_created := p_created + 1;
        INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'created',auth.uid()) ON CONFLICT DO NOTHING;
      ELSE
        SELECT id INTO v_profile FROM sj_profiles WHERE id=(res->>'profile')::uuid AND workspace_id=_workspace_id AND archived_at IS NULL FOR UPDATE;
        IF v_profile IS NULL THEN RAISE EXCEPTION 'Perfil escolhido inválido ou arquivado'; END IF;
        SELECT contact_id INTO v_tmp FROM sj_profiles WHERE id=v_profile;
        IF v_tmp IS NULL THEN
          UPDATE sj_profiles SET contact_id = v_contact WHERE id = v_profile;
          INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
          VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'linked',auth.uid()) ON CONFLICT DO NOTHING;
        ELSIF v_tmp <> v_contact THEN RAISE EXCEPTION 'Perfil ligado a outro contacto';
        ELSE
          INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
          VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'profile',v_profile,'reused',auth.uid()) ON CONFLICT DO NOTHING;
        END IF;
        p_reused := p_reused + 1;
      END IF;

      SELECT id INTO v_enr FROM sj_enrollments WHERE workspace_id=_workspace_id AND profile_id=v_profile AND cohort_id=_cohort_id
        ORDER BY created_at LIMIT 1;
      IF v_enr IS NOT NULL THEN
        e_existing := e_existing + 1;
        INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_enr,'evidence',auth.uid()) ON CONFLICT DO NOTHING;
        CONTINUE;
      END IF;

      PERFORM 1 FROM sj_enrollments WHERE workspace_id=_workspace_id AND profile_id=v_profile AND course_id=v_course AND cohort_id IS NULL FOR UPDATE;
      v_legacy := ARRAY(SELECT id FROM sj_enrollments WHERE workspace_id=_workspace_id AND profile_id=v_profile AND course_id=v_course
        AND cohort_id IS NULL AND coalesce(admin_status,'') <> 'cancelled');
      v_dec_legacy := r->'decision'->>'legacy_enrollment';
      IF cardinality(v_legacy) > 0 THEN
        IF v_dec_legacy IS NULL THEN
          RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PENDING:legacy_enrollment_needs_decision';
        ELSIF v_dec_legacy <> 'separate' THEN
          IF NOT (v_dec_legacy::uuid = ANY(v_legacy)) THEN RAISE EXCEPTION 'Inscrição antiga escolhida não é candidata'; END IF;
          UPDATE sj_enrollments SET cohort_id = _cohort_id WHERE id = v_dec_legacy::uuid;
          e_linked := e_linked + 1;
          INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
          VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_dec_legacy::uuid,'linked',auth.uid()) ON CONFLICT DO NOTHING;
          CONTINUE;
        END IF;
      END IF;

      v_ped := coalesce(nullif(r->>'pedagogic_status',''),'not_started');
      v_adm := coalesce(nullif(r->>'admin_status',''), CASE WHEN v_ped='completed' THEN 'admin_completed' WHEN v_ped='withdrawn' THEN 'cancelled' ELSE 'confirmed' END);
      v_fin := nullif(r->>'financial_status','');
      IF v_fin IS NOT NULL AND v_fin NOT IN ('unpaid','paid','partial','refunded','waived') THEN v_fin := NULL; END IF;
      v_amt := CASE WHEN (r->>'agreed_amount') ~ '^\d+(\.\d{1,2})?$' THEN (r->>'agreed_amount')::numeric END;

      INSERT INTO sj_enrollments (workspace_id, profile_id, course_id, cohort_id, source, status, payment_status,
        admin_status, pedagogic_status, financial_status, financial_unknown, agreed_amount, base_amount, completed_at, notes,
        import_source_file, import_source_sheet, import_source_row)
      VALUES (_workspace_id, v_profile, v_course, _cohort_id, 'import',
        CASE WHEN v_ped='completed' THEN 'completed' WHEN v_ped='withdrawn' THEN 'dropped' ELSE 'enrolled' END,
        CASE WHEN v_fin IN ('unpaid','paid','partial','refunded') THEN v_fin ELSE 'unknown' END,
        v_adm, v_ped, v_fin, (v_fin IS NULL AND v_amt IS NULL), v_amt, v_amt,
        CASE WHEN v_ped='completed' AND (r->>'completed_at') ~ '^\d{4}-\d{2}-\d{2}$' THEN (r->>'completed_at')::timestamptz END,
        nullif(left(r->>'notes',1000),''), v_file, v_sheet, v_row)
      RETURNING id INTO v_enr;
      e_created := e_created + 1;
      INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
      VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'enrollment',v_enr,'created',auth.uid()) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'PENDING:%' THEN pend := pend || jsonb_build_object('row',v_row,'reason',substr(SQLERRM,9));
      ELSE errs := errs || jsonb_build_object('row',v_row,'error',SQLERRM); END IF;
    END;
  END LOOP;

  SELECT count(*) FILTER (WHERE entity_type='contact' AND action='created'), count(*) FILTER (WHERE entity_type='profile' AND action='created'),
         count(*) FILTER (WHERE entity_type='enrollment' AND action='created'), count(*) FILTER (WHERE entity_type='enrollment' AND action='linked')
    INTO c_created, p_created, e_created, e_linked FROM sj_import_provenance WHERE job_id = v_job;

  UPDATE sj_import_jobs SET status='completed', completed_at=now(), processed_rows=i, success_count=e_created+e_linked,
    skipped_count=e_existing + jsonb_array_length(pend), error_count=jsonb_array_length(errs), errors=errs,
    results_summary=jsonb_build_object('contacts_created',c_created,'profiles_created',p_created,'enrollments_created',e_created,
      'enrollments_linked',e_linked,'enrollments_existing',e_existing,'pending',pend)
  WHERE id=v_job;
  PERFORM set_config('sj.historical_import', 'off', true);
  RETURN jsonb_build_object('job_id',v_job,'contacts_created',c_created,'profiles_created',p_created,'enrollments_created',e_created,
    'enrollments_linked',e_linked,'enrollments_existing',e_existing,'pending',pend,'errors',errs);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_historical_rows(uuid,uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_import_historical_rows(uuid,uuid,jsonb,jsonb) TO authenticated;