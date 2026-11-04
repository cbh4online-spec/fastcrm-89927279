CREATE OR REPLACE FUNCTION public.sj_completion_requires_attendance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Historical imports (only via sj_import_historical_rows) may carry completed training without attendance rows.
  IF NEW.source = 'import' AND current_setting('sj.historical_import', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.pedagogic_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.pedagogic_status IS DISTINCT FROM 'completed')
     AND NOT EXISTS (SELECT 1 FROM sj_attendance a WHERE a.enrollment_id = NEW.id AND a.present) THEN
    RAISE EXCEPTION 'Não é possível concluir a formação sem presenças registadas';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.sj_import_historical_rows(
  _workspace_id uuid, _cohort_id uuid, _dedupe_key text, _rows jsonb, _file_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_course uuid; v_job uuid; r jsonb; i int := 0;
  v_contact uuid; v_profile uuid; v_enr uuid;
  v_email text; v_phone text; v_nif text; v_num text; v_name text;
  c_created int := 0; c_reused int := 0; e_created int := 0; e_skipped int := 0; cert int := 0; errs jsonb := '[]'::jsonb;
  v_ped text; v_fin text; v_adm text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN
    RAISE EXCEPTION 'Sem permissão para importar históricos';
  END IF;
  IF _dedupe_key NOT IN ('email','nif','phone','client_number') THEN RAISE EXCEPTION 'Chave de deduplicação inválida'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 2000 THEN RAISE EXCEPTION 'Máximo 2000 linhas por importação'; END IF;
  SELECT course_id INTO v_course FROM sj_cohorts WHERE id = _cohort_id AND workspace_id = _workspace_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'Edição inválida para esta organização'; END IF;

  PERFORM set_config('sj.historical_import', 'on', true);
  INSERT INTO sj_import_jobs (workspace_id, source, status, file_name, total_rows, created_by, started_at, mapping_config)
  VALUES (_workspace_id, 'historical_excel', 'processing', left(_file_name,255), jsonb_array_length(_rows), auth.uid(), now(),
          jsonb_build_object('cohort_id', _cohort_id, 'dedupe_key', _dedupe_key))
  RETURNING id INTO v_job;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    i := i + 1;
    BEGIN
      v_name := nullif(trim(left(r->>'full_name',200)),'');
      v_email := nullif(lower(trim(left(r->>'email',255))),'');
      v_phone := nullif(trim(left(r->>'phone',40)),'');
      v_nif := nullif(trim(left(r->>'nif',20)),'');
      v_num := nullif(trim(left(r->>'client_number',50)),'');
      IF v_name IS NULL THEN RAISE EXCEPTION 'Nome em falta'; END IF;
      v_ped := coalesce(r->>'pedagogic_status','not_started');
      v_fin := coalesce(r->>'financial_status','unpaid');
      v_adm := coalesce(r->>'admin_status','confirmed');

      v_contact := NULL;
      SELECT id INTO v_contact FROM contacts c
       WHERE c.workspace_id = _workspace_id AND c.deleted_at IS NULL AND (
         (_dedupe_key='email' AND v_email IS NOT NULL AND lower(c.email)=v_email) OR
         (_dedupe_key='nif' AND v_nif IS NOT NULL AND c.tax_id=v_nif) OR
         (_dedupe_key='phone' AND v_phone IS NOT NULL AND regexp_replace(c.phone,'\D','','g')=regexp_replace(v_phone,'\D','','g')) OR
         (_dedupe_key='client_number' AND v_num IS NOT NULL AND c.client_number=v_num))
       ORDER BY c.created_at DESC LIMIT 1;
      IF v_contact IS NULL THEN
        INSERT INTO contacts (workspace_id, name, email, phone, tax_id, client_number, source)
        VALUES (_workspace_id, v_name, v_email, v_phone, v_nif, v_num, 'sj_historical_import') RETURNING id INTO v_contact;
        c_created := c_created + 1;
      ELSE c_reused := c_reused + 1; END IF;

      SELECT id INTO v_profile FROM sj_profiles WHERE workspace_id=_workspace_id AND contact_id=v_contact;
      IF v_profile IS NULL THEN
        INSERT INTO sj_profiles (workspace_id, contact_id, full_name, email, phone, lifecycle_stage)
        VALUES (_workspace_id, v_contact, v_name, v_email, v_phone, CASE WHEN v_ped='completed' THEN 'completed' ELSE 'enrolled' END)
        RETURNING id INTO v_profile;
      END IF;

      IF EXISTS (SELECT 1 FROM sj_enrollments WHERE workspace_id=_workspace_id AND profile_id=v_profile AND cohort_id=_cohort_id) THEN
        e_skipped := e_skipped + 1;
        CONTINUE;
      END IF;
      INSERT INTO sj_enrollments (workspace_id, profile_id, course_id, cohort_id, source, status, payment_status,
        admin_status, pedagogic_status, financial_status, agreed_amount, base_amount, completed_at, notes,
        import_source_file, import_source_row)
      VALUES (_workspace_id, v_profile, v_course, _cohort_id, 'import',
        CASE WHEN v_ped='completed' THEN 'completed' WHEN v_ped='withdrawn' THEN 'dropped' ELSE 'enrolled' END,
        CASE WHEN v_fin IN ('unpaid','paid','partial','refunded') THEN v_fin ELSE 'unpaid' END,
        v_adm, v_ped, v_fin,
        nullif(r->>'agreed_amount','')::numeric, nullif(r->>'agreed_amount','')::numeric,
        CASE WHEN v_ped='completed' THEN nullif(r->>'completed_at','')::timestamptz END,
        nullif(left(r->>'notes',1000),''), left(_file_name,255), (r->>'source_row'))
      RETURNING id INTO v_enr;
      e_created := e_created + 1;

      IF coalesce((r->>'certificate_issued')::boolean,false) THEN
        INSERT INTO sj_certificates (workspace_id, enrollment_id, status, issued_at, created_by)
        VALUES (_workspace_id, v_enr, 'issued', coalesce(nullif(r->>'certificate_date','')::timestamptz, nullif(r->>'completed_at','')::timestamptz, now()), auth.uid())
        ON CONFLICT (enrollment_id) DO NOTHING;
        cert := cert + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      errs := errs || jsonb_build_object('row', coalesce(r->>'source_row', i::text), 'error', SQLERRM);
    END;
  END LOOP;

  UPDATE sj_import_jobs SET status = 'completed', completed_at = now(), processed_rows = i,
    success_count = e_created, skipped_count = e_skipped, error_count = jsonb_array_length(errs), errors = errs,
    results_summary = jsonb_build_object('contacts_created', c_created, 'contacts_reused', c_reused,
      'enrollments_created', e_created, 'enrollments_skipped', e_skipped, 'certificates', cert)
  WHERE id = v_job;
  PERFORM set_config('sj.historical_import', 'off', true);

  RETURN jsonb_build_object('job_id', v_job, 'contacts_created', c_created, 'contacts_reused', c_reused,
    'enrollments_created', e_created, 'enrollments_skipped', e_skipped, 'certificates', cert, 'errors', errs);
END $function$;

REVOKE ALL ON FUNCTION public.sj_import_historical_rows(uuid,uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_import_historical_rows(uuid,uuid,text,jsonb,text) TO authenticated;