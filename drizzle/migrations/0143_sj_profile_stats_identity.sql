-- estatísticas do perfil sem datas inventadas, nome como pista obrigatória, consolidação com prova de identidade.
ALTER TABLE public.sj_profile_merges ADD COLUMN IF NOT EXISTS identity_evidence jsonb;
ALTER TABLE public.sj_profile_merges ADD COLUMN IF NOT EXISTS evidence_note text;
ALTER TABLE public.sj_profile_merges ADD COLUMN IF NOT EXISTS preview_fingerprint text;

-- Recalcula a partir de TODAS as inscrições do perfil; só datas conhecidas; nunca now().
CREATE OR REPLACE FUNCTION public.sj_recompute_profile_course_stats(_workspace_id uuid, _profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
  UPDATE public.sj_profiles p SET
    total_courses_completed = (SELECT count(*) FROM public.sj_enrollments e WHERE e.profile_id=p.id AND e.workspace_id=p.workspace_id
       AND (e.pedagogic_status='completed' OR e.status='completed') AND coalesce(e.admin_status,'') <> 'cancelled'),
    last_course_completed_at = (SELECT max(e.completed_at) FROM public.sj_enrollments e WHERE e.profile_id=p.id AND e.workspace_id=p.workspace_id
       AND (e.pedagogic_status='completed' OR e.status='completed') AND coalesce(e.admin_status,'') <> 'cancelled' AND e.completed_at IS NOT NULL),
    updated_at = now()
  WHERE p.id=_profile_id AND p.workspace_id=_workspace_id;
$$;
REVOKE ALL ON FUNCTION public.sj_recompute_profile_course_stats(uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_sj_profile_course_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE was_done boolean; is_done boolean;
BEGIN
  is_done := NEW.status='completed' OR NEW.pedagogic_status='completed';
  was_done := TG_OP='UPDATE' AND (OLD.status='completed' OR OLD.pedagogic_status='completed');
  IF is_done IS DISTINCT FROM was_done OR (TG_OP='UPDATE' AND (NEW.completed_at IS DISTINCT FROM OLD.completed_at OR NEW.profile_id IS DISTINCT FROM OLD.profile_id)) THEN
    PERFORM public.sj_recompute_profile_course_stats(NEW.workspace_id, NEW.profile_id);
    IF TG_OP='UPDATE' AND NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
      PERFORM public.sj_recompute_profile_course_stats(OLD.workspace_id, OLD.profile_id); END IF;
  END IF;
  -- Só passa a 'completed' quem estava ativo/inscrito e já não tem nenhuma outra formação em curso; nunca toca inativos/outros estados.
  IF is_done AND NOT coalesce(was_done,false) THEN
    UPDATE public.sj_profiles p SET lifecycle_stage='completed', updated_at=now()
     WHERE p.id=NEW.profile_id AND p.workspace_id=NEW.workspace_id AND p.lifecycle_stage IN ('active','enrolled')
       AND NOT EXISTS (SELECT 1 FROM public.sj_enrollments e WHERE e.profile_id=p.id AND e.workspace_id=p.workspace_id AND e.id<>NEW.id
         AND coalesce(e.status,'') NOT IN ('completed','dropped','cancelled','interested')
         AND coalesce(e.admin_status,'') NOT IN ('cancelled','admin_completed')
         AND coalesce(e.pedagogic_status,'not_started') NOT IN ('completed','not_completed','withdrawn'));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sj_import_classify(_workspace_id uuid, _row jsonb, _file_hash text DEFAULT NULL, _sheet text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE
  v_name text := nullif(trim(left(_row->>'full_name',200)),'');
  v_email_raw text := nullif(trim(left(_row->>'email',255)),'');
  v_phone_raw text := nullif(trim(left(_row->>'phone',60)),'');
  v_nif_raw text := nullif(regexp_replace(coalesce(_row->>'nif',''),'\s','','g'),'');
  v_num text := nullif(trim(left(_row->>'client_number',50)),'');
  v_email text; v_phone text; v_nif text; v_phone_hint text;
  hints jsonb := '[]'::jsonb; reasons jsonb := '[]'::jsonb;
  contacts_j jsonb; profiles_j jsonb; prev jsonb := '{}'::jsonb; prev_raw jsonb;
  n_contacts int; n_strong_ok int; n_profiles int; status text;
  v_contact uuid; v_profile uuid; v_prev_profile uuid; v_row_fp text; v_cand_fp text; v_labels text;
BEGIN
  IF v_email_raw IS NOT NULL THEN
    IF v_email_raw ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN v_email := lower(v_email_raw);
    ELSE
      v_phone_hint := public.sj_norm_phone(v_email_raw);
      hints := hints || jsonb_build_object('code', CASE WHEN v_phone_hint IS NOT NULL THEN 'phone_in_email' ELSE 'invalid_email' END, 'value', v_email_raw);
    END IF;
  END IF;
  IF v_phone_raw IS NOT NULL THEN
    IF v_phone_raw ~ '^\s*\d{4}\s*-\s*\d{3}' OR v_phone_raw ~ '[A-Za-zÀ-ÿ]{3,}' THEN
      hints := hints || jsonb_build_object('code','postal_or_place_in_phone','value',v_phone_raw);
    ELSE v_phone := public.sj_norm_phone(v_phone_raw);
      IF v_phone IS NULL THEN hints := hints || jsonb_build_object('code','invalid_phone','value',v_phone_raw); END IF;
    END IF;
  END IF;
  IF v_nif_raw IS NOT NULL THEN
    IF public.sj_valid_nif(v_nif_raw) THEN
      v_nif := regexp_replace(v_nif_raw,'^PT','','i');
      IF public.sj_nif_kind(v_nif) = 'company' THEN
        hints := hints || jsonb_build_object('code','company_nif','value',v_nif); v_nif := NULL;
      END IF;
    ELSE hints := hints || jsonb_build_object('code','invalid_nif','value',v_nif_raw); END IF;
  END IF;

  IF _file_hash IS NOT NULL THEN
    SELECT jsonb_object_agg(entity_type, entity_id) INTO prev_raw FROM (
      SELECT DISTINCT ON (pv.entity_type) pv.entity_type, pv.entity_id FROM public.sj_import_provenance pv
      WHERE pv.workspace_id=_workspace_id AND pv.file_hash=_file_hash AND pv.sheet_name=coalesce(_sheet,'') AND pv.row_ref=_row->>'source_row'
        AND pv.entity_type IN ('contact','profile') ORDER BY pv.entity_type, pv.created_at) q;
    IF prev_raw ? 'contact' AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id=(prev_raw->>'contact')::uuid
        AND c.workspace_id=_workspace_id AND c.deleted_at IS NULL) THEN
      prev := prev || jsonb_build_object('contact', prev_raw->>'contact');
    END IF;
    IF prev_raw ? 'profile' THEN
      v_prev_profile := public.sj_canonical_profile(_workspace_id, (prev_raw->>'profile')::uuid);
      IF v_prev_profile IS NOT NULL THEN
        prev := prev || jsonb_build_object('profile', v_prev_profile, 'original_profile', prev_raw->>'profile');
      ELSE hints := hints || jsonb_build_object('code','previous_profile_unresolvable','value',prev_raw->>'profile'); END IF;
    END IF;
  END IF;

  WITH cand AS (
    SELECT c.id, c.name, c.email, c.phone, c.tax_id, c.client_number, c.entity_type,
      array_remove(ARRAY[
        CASE WHEN v_nif IS NOT NULL AND regexp_replace(coalesce(c.tax_id,''),'^PT|\s','','gi') = v_nif THEN 'nif' END,
        CASE WHEN v_email IS NOT NULL AND lower(trim(c.email)) = v_email THEN 'email' END,
        CASE WHEN v_phone IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone THEN 'phone' END,
        CASE WHEN v_phone_hint IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone_hint THEN 'phone_hint' END,
        CASE WHEN v_num IS NOT NULL AND c.client_number = v_num THEN 'client_number' END,
        CASE WHEN public.sj_names_compatible(c.name, v_name) THEN 'name_hint' END,
        CASE WHEN prev ? 'contact' AND c.id = (prev->>'contact')::uuid THEN 'previous_import' END
      ], NULL) AS matched_by,
      public.sj_names_compatible(c.name, v_name) AS name_ok,
      (v_nif IS NOT NULL AND public.sj_valid_nif(c.tax_id) AND regexp_replace(c.tax_id,'^PT|\s','','gi') <> v_nif) AS nif_conflict
    FROM public.contacts c
    WHERE c.workspace_id=_workspace_id AND c.deleted_at IS NULL AND (
      (v_nif IS NOT NULL AND regexp_replace(coalesce(c.tax_id,''),'^PT|\s','','gi') = v_nif)
      OR (v_email IS NOT NULL AND lower(trim(c.email)) = v_email)
      OR (v_phone IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone)
      OR (v_phone_hint IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone_hint)
      OR (v_num IS NOT NULL AND c.client_number = v_num)
      OR public.sj_names_compatible(c.name, v_name)
      OR (prev ? 'contact' AND c.id = (prev->>'contact')::uuid))
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'phone',phone,'tax_id',tax_id,
    'client_number',client_number,'entity_type',entity_type,'matched_by',to_jsonb(matched_by),'name_ok',name_ok,
    'nif_conflict',nif_conflict) ORDER BY id),'[]'::jsonb)
  INTO contacts_j FROM cand;

  WITH idraw AS (
    SELECT p.id FROM public.sj_profiles p
    WHERE p.workspace_id=_workspace_id AND (
      p.contact_id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') <> '["name_hint"]'::jsonb)
      OR (v_email IS NOT NULL AND lower(trim(p.email)) = v_email)
      OR (v_phone IS NOT NULL AND (public.sj_norm_phone(p.phone) = v_phone OR public.sj_norm_phone(p.email) = v_phone))
      OR (v_phone_hint IS NOT NULL AND (public.sj_norm_phone(p.phone) = v_phone_hint OR public.sj_norm_phone(p.email) = v_phone_hint))
      )
    UNION SELECT v_prev_profile WHERE v_prev_profile IS NOT NULL
  ), idcanon AS (
    SELECT DISTINCT public.sj_canonical_profile(_workspace_id, id) AS id FROM idraw
  ), namecanon AS (
    -- nome é sempre pista (nunca associação): perfis com nome compatível entram como candidatos a rever
    SELECT DISTINCT public.sj_canonical_profile(_workspace_id, p.id) AS id FROM public.sj_profiles p
     WHERE p.workspace_id=_workspace_id AND p.archived_at IS NULL AND public.sj_names_compatible(p.full_name, v_name)
  ), canon AS (
    SELECT id, bool_and(name_only) AS name_only FROM (
      SELECT id, false AS name_only FROM idcanon UNION ALL SELECT id, true FROM namecanon) u GROUP BY id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'phone',p.phone,
      'contact_id',p.contact_id,'name_ok',public.sj_names_compatible(p.full_name,v_name),'name_only',canon.name_only,
      'enrollments',(SELECT count(*) FROM public.sj_enrollments e WHERE e.profile_id=p.id AND e.workspace_id=_workspace_id)) ORDER BY p.id),'[]'::jsonb)
  INTO profiles_j FROM canon JOIN public.sj_profiles p ON p.id = canon.id
  WHERE canon.id IS NOT NULL AND p.workspace_id=_workspace_id AND p.archived_at IS NULL;

  n_contacts := jsonb_array_length(contacts_j);
  n_profiles := jsonb_array_length(profiles_j);
  SELECT count(*) INTO n_strong_ok FROM jsonb_array_elements(contacts_j) x
   WHERE (x->>'name_ok')::boolean AND NOT (x->>'nif_conflict')::boolean
     AND (x->'matched_by') ?| ARRAY['nif','email','phone','client_number','previous_import'];

  IF v_name IS NULL THEN reasons := reasons || '"missing_name"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE NOT (x->>'name_ok')::boolean) THEN
    reasons := reasons || '"identifier_name_mismatch"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(profiles_j) x WHERE NOT (x->>'name_ok')::boolean) THEN
    reasons := reasons || '"profile_name_mismatch"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->>'nif_conflict')::boolean) THEN
    reasons := reasons || '"shared_identifier_different_nif"'::jsonb; END IF;
  IF n_contacts > 1 THEN reasons := reasons || '"multiple_contacts"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') = '["name_hint"]'::jsonb) THEN
    reasons := reasons || '"name_hint"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(profiles_j) x WHERE (x->>'name_only')::boolean) THEN
    reasons := reasons || '"profile_name_hint"'::jsonb; END IF;
  IF v_phone LIKE 'local:%' THEN
    hints := hints || jsonb_build_object('code','phone_without_country_code','value',v_phone_raw);
    reasons := reasons || '"phone_without_country_code"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') ? 'phone_hint'
             AND NOT (x->'matched_by') ?| ARRAY['nif','email','phone','client_number','previous_import']) THEN
    reasons := reasons || '"phone_hint_only"'::jsonb; END IF;

  IF n_contacts = 1 AND n_strong_ok = 1 AND jsonb_array_length(reasons) = 0 THEN
    v_contact := (contacts_j->0->>'id')::uuid;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(profiles_j) x WHERE (x->>'contact_id') IS DISTINCT FROM v_contact::text) THEN
      reasons := reasons || '"other_candidate_profile"'::jsonb;
    ELSE
      SELECT (x->>'id')::uuid INTO v_profile FROM jsonb_array_elements(profiles_j) x LIMIT 1;
    END IF;
  ELSIF n_contacts = 0 AND n_profiles > 0 THEN
    reasons := reasons || '"orphan_profile_candidate"'::jsonb;
  END IF;

  status := CASE WHEN v_name IS NULL THEN 'invalid'
    WHEN jsonb_array_length(reasons) > 0 THEN 'review'
    WHEN n_contacts = 0 AND n_profiles = 0 THEN 'new'
    ELSE 'match' END;

  SELECT string_agg(public.sj_norm_text(l), '|' ORDER BY public.sj_norm_text(l)) INTO v_labels
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(_row->'labels')='array' THEN _row->'labels' ELSE '[]'::jsonb END) l;
  v_row_fp := encode(sha256(convert_to(concat_ws('§', public.sj_norm_text(v_name), v_email_raw, v_phone_raw, v_nif_raw, v_num, v_labels), 'UTF8')), 'hex');
  v_cand_fp := encode(sha256(convert_to(concat_ws('§',
      (SELECT string_agg(x->>'id', ',' ORDER BY x->>'id') FROM jsonb_array_elements(contacts_j) x),
      (SELECT string_agg((x->>'id') || ':' || coalesce(x->>'contact_id','-'), ',' ORDER BY x->>'id') FROM jsonb_array_elements(profiles_j) x)), 'UTF8')), 'hex');

  RETURN jsonb_build_object('source_row', _row->>'source_row', 'status', status, 'reasons', reasons, 'hints', hints,
    'normalized', jsonb_build_object('email',v_email,'phone',v_phone,'nif',v_nif,'client_number',v_num),
    'contacts', contacts_j, 'profiles', profiles_j, 'previous', prev,
    'row_fingerprint', v_row_fp, 'candidate_fingerprint', v_cand_fp,
    'auto_contact_id', CASE WHEN status='match' THEN v_contact END,
    'auto_profile_id', CASE WHEN status='match' THEN v_profile END);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_classify(uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sj_import_resolve_v2(_cls jsonb, _decision jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO public, pg_temp AS $$
DECLARE st text := _cls->>'status'; dc text := _decision->>'contact'; dp text := _decision->>'profile';
  hard text; con jsonb; prof jsonb;
BEGIN
  IF st = 'invalid' THEN RETURN jsonb_build_object('pending','invalid_row'); END IF;
  SELECT x INTO hard FROM jsonb_array_elements_text(_cls->'reasons') x
   WHERE x IN ('missing_name','identifier_name_mismatch','profile_name_mismatch','shared_identifier_different_nif','phone_hint_only') LIMIT 1;
  IF hard IS NOT NULL THEN RETURN jsonb_build_object('pending','conflict:' || hard); END IF;

  IF _decision IS NULL OR _decision = '{}'::jsonb THEN
    IF st = 'new' THEN RETURN jsonb_build_object('contact','new','profile','new'); END IF;
    IF st = 'match' THEN RETURN jsonb_build_object('contact',_cls->>'auto_contact_id','profile',coalesce(_cls->>'auto_profile_id','new')); END IF;
    RETURN jsonb_build_object('pending','needs_decision');
  END IF;

  IF dc IS NULL OR dp IS NULL THEN RETURN jsonb_build_object('pending','incomplete_decision'); END IF;
  IF dc = 'new' THEN
    -- pessoa distinta só pode ser declarada contra candidatos que coincidem apenas pelo nome
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_cls->'contacts') x WHERE (x->'matched_by') <> '["name_hint"]'::jsonb) THEN
      RETURN jsonb_build_object('pending','contact_candidates_exist'); END IF;
  ELSE
    SELECT x INTO con FROM jsonb_array_elements(_cls->'contacts') x WHERE x->>'id' = dc;
    IF con IS NULL THEN RETURN jsonb_build_object('pending','contact_not_candidate'); END IF;
    IF NOT (con->>'name_ok')::boolean OR (con->>'nif_conflict')::boolean
       OR NOT (con->'matched_by') ?| ARRAY['nif','email','phone','client_number','previous_import'] THEN
      RETURN jsonb_build_object('pending','contact_not_acceptable'); END IF;
  END IF;
  IF dp = 'new' THEN
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(_cls->'profiles') x WHERE NOT coalesce((x->>'name_only')::boolean,false)) THEN
      RETURN jsonb_build_object('pending','profile_candidates_exist'); END IF;
  ELSE
    SELECT x INTO prof FROM jsonb_array_elements(_cls->'profiles') x WHERE x->>'id' = dp;
    IF prof IS NULL THEN RETURN jsonb_build_object('pending','profile_not_candidate'); END IF;
    IF NOT (prof->>'name_ok')::boolean THEN RETURN jsonb_build_object('pending','profile_not_acceptable'); END IF;
    IF prof->>'contact_id' IS NOT NULL AND (dc = 'new' OR prof->>'contact_id' <> dc) THEN
      RETURN jsonb_build_object('pending','profile_linked_to_other_contact'); END IF;
  END IF;
  IF dc <> 'new' AND EXISTS (SELECT 1 FROM jsonb_array_elements(_cls->'profiles') x WHERE x->>'contact_id' = dc AND x->>'id' <> dp) THEN
    RETURN jsonb_build_object('pending','contact_has_other_profile'); END IF;
  RETURN jsonb_build_object('contact',dc,'profile',dp,'manual',true);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_resolve_v2(jsonb,jsonb) FROM PUBLIC, anon, authenticated;

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
  VALUES (_workspace_id, 'historical_excel', 'processing', v_file, jsonb_array_length(_rows), auth.uid(), now(),
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

  UPDATE public.sj_import_jobs SET status='completed', completed_at=now(), processed_rows=i, success_count=e_created+e_linked,
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

CREATE OR REPLACE FUNCTION public.sj_profile_merge_preview(_workspace_id uuid, _source uuid, _target uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE s public.sj_profiles; t public.sj_profiles; blockers jsonb := '[]'::jsonb; deps jsonb := '{}'::jsonb; rec record; n bigint; nx bigint;
  supported text[] := ARRAY['sj_enrollments','sj_touchpoints','sj_tasks','sj_automation_logs','sj_ai_suggestions','sj_course_recommendations'];
  coincident jsonb; evidence jsonb := '[]'::jsonb; cs public.contacts; ct public.contacts; v_fp text;
BEGIN
  IF public.sj_import_is_manager(_workspace_id) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO s FROM public.sj_profiles WHERE id=_source AND workspace_id=_workspace_id;
  SELECT * INTO t FROM public.sj_profiles WHERE id=_target AND workspace_id=_workspace_id;
  IF s.id IS NULL OR t.id IS NULL THEN RAISE EXCEPTION 'Perfis não pertencem a esta organização'; END IF;
  IF _source = _target THEN blockers := blockers || '"same_profile"'::jsonb; END IF;
  IF s.archived_at IS NOT NULL OR t.archived_at IS NOT NULL THEN blockers := blockers || '"archived_profile"'::jsonb; END IF;
  IF s.contact_id IS NOT NULL AND t.contact_id IS NOT NULL AND s.contact_id <> t.contact_id THEN
    blockers := blockers || '"different_contacts"'::jsonb; END IF;
  -- identidade: nome nunca prova, só bloqueia quando incompatível
  IF NOT public.sj_names_compatible(s.full_name, t.full_name) THEN blockers := blockers || '"names_incompatible"'::jsonb; END IF;
  SELECT * INTO cs FROM public.contacts WHERE id=s.contact_id AND workspace_id=_workspace_id;
  SELECT * INTO ct FROM public.contacts WHERE id=t.contact_id AND workspace_id=_workspace_id;
  IF public.sj_valid_nif(cs.tax_id) AND public.sj_valid_nif(ct.tax_id)
     AND regexp_replace(cs.tax_id,'^PT|\s','','gi') <> regexp_replace(ct.tax_id,'^PT|\s','','gi') THEN
    blockers := blockers || '"different_nif"'::jsonb; END IF;
  IF nullif(lower(trim(coalesce(s.email,cs.email))),'') IS NOT NULL AND nullif(lower(trim(coalesce(t.email,ct.email))),'') IS NOT NULL
     AND lower(trim(coalesce(s.email,cs.email))) <> lower(trim(coalesce(t.email,ct.email)))
     AND coalesce(s.email,cs.email) ~ '@' AND coalesce(t.email,ct.email) ~ '@' THEN
    blockers := blockers || '"different_emails"'::jsonb; END IF;
  IF s.contact_id IS NOT NULL AND s.contact_id = t.contact_id THEN evidence := evidence || '"same_contact"'::jsonb; END IF;
  IF lower(trim(coalesce(s.email,cs.email))) = lower(trim(coalesce(t.email,ct.email))) AND coalesce(s.email,cs.email) ~ '@' THEN
    evidence := evidence || '"same_email"'::jsonb; END IF;
  IF public.sj_norm_phone(coalesce(s.phone,cs.phone)) IS NOT NULL
     AND public.sj_norm_phone(coalesce(s.phone,cs.phone)) NOT LIKE 'local:%'
     AND public.sj_norm_phone(coalesce(s.phone,cs.phone)) = public.sj_norm_phone(coalesce(t.phone,ct.phone)) THEN
    evidence := evidence || '"same_phone"'::jsonb; END IF;
  IF public.sj_valid_nif(cs.tax_id) AND regexp_replace(cs.tax_id,'^PT|\s','','gi') = regexp_replace(coalesce(ct.tax_id,''),'^PT|\s','','gi') THEN
    evidence := evidence || '"same_nif"'::jsonb; END IF;

  FOR rec IN SELECT DISTINCT cl.relname::text AS tbl, a.attname::text AS col FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class cl ON cl.oid=c.conrelid
      JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum = ANY(c.conkey)
     WHERE c.contype='f' AND c.confrelid='public.sj_profiles'::regclass
    UNION SELECT table_name::text, column_name::text FROM information_schema.columns
     WHERE table_schema='public' AND column_name IN ('profile_id','sj_profile_id') AND table_name LIKE 'sj\_%'
  LOOP
    IF rec.tbl IN ('sj_profiles','sj_profile_merges') THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', rec.tbl, rec.col) INTO n USING _source;
    deps := deps || jsonb_build_object(rec.tbl || '.' || rec.col, n);
    IF n > 0 AND NOT (rec.tbl = ANY(supported) AND rec.col = 'profile_id') THEN
      blockers := blockers || to_jsonb('unsupported_relation:' || rec.tbl || '.' || rec.col); END IF;
    IF n > 0 AND rec.tbl = ANY(supported) THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE profile_id = $1 AND workspace_id IS DISTINCT FROM $2', rec.tbl) INTO nx USING _source, _workspace_id;
      IF nx > 0 THEN blockers := blockers || to_jsonb('cross_workspace_dependent:' || rec.tbl); END IF;
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(jsonb_build_object('source_enrollment',a.id,'target_enrollment',b.id,'course_id',a.course_id,'cohort_id',a.cohort_id)),'[]'::jsonb)
    INTO coincident FROM public.sj_enrollments a JOIN public.sj_enrollments b
      ON b.profile_id=_target AND b.course_id=a.course_id AND b.cohort_id IS NOT DISTINCT FROM a.cohort_id
   WHERE a.profile_id=_source;
  IF jsonb_array_length(coincident) > 0 THEN blockers := blockers || '"coincident_enrollments"'::jsonb; END IF;

  deps := deps || jsonb_build_object(
    'attendance', (SELECT count(*) FROM public.sj_attendance x JOIN public.sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'certificates', (SELECT count(*) FROM public.sj_certificates x JOIN public.sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'installments', (SELECT count(*) FROM public.sj_installments x JOIN public.sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'payments', (SELECT count(*) FROM public.sj_enrollment_payments x JOIN public.sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'invoice_links', (SELECT count(*) FROM public.sj_enrollment_invoices x JOIN public.sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'provenance', (SELECT count(*) FROM public.sj_import_provenance WHERE workspace_id=_workspace_id AND entity_type='profile' AND entity_id=_source));

  v_fp := encode(sha256(convert_to(concat_ws('§', s.id, t.id, s.contact_id, t.contact_id, s.full_name, t.full_name, s.email, t.email, s.phone, t.phone,
    s.archived_at, t.archived_at, deps::text, coincident::text, blockers::text, evidence::text), 'UTF8')), 'hex');
  RETURN jsonb_build_object('source', jsonb_build_object('id',s.id,'full_name',s.full_name,'email',s.email,'phone',s.phone,'contact_id',s.contact_id),
    'target', jsonb_build_object('id',t.id,'full_name',t.full_name,'email',t.email,'phone',t.phone,'contact_id',t.contact_id),
    'names_compatible', public.sj_names_compatible(s.full_name, t.full_name),
    'dependencies', deps, 'coincident_enrollments', coincident, 'blockers', blockers,
    'identity_evidence', evidence, 'requires_manual_evidence', jsonb_array_length(evidence) = 0,
    'fingerprint', v_fp, 'can_merge', jsonb_array_length(blockers) = 0);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge_preview(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge_preview(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sj_profile_merge(_workspace_id uuid, _source uuid, _target uuid, _reason text, _preview_fingerprint text, _evidence_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE pv jsonb; moved jsonb := '{}'::jsonb; ids jsonb; v_merge uuid; s public.sj_profiles; v_contact uuid; tbl text;
BEGIN
  IF public.sj_import_is_manager(_workspace_id) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(coalesce(trim(_reason),'')) < 5 OR length(_reason) > 1000 THEN RAISE EXCEPTION 'Motivo obrigatório (5 a 1000 caracteres)'; END IF;
  PERFORM 1 FROM public.sj_profiles WHERE id IN (_source,_target) AND workspace_id=_workspace_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.sj_enrollments WHERE profile_id IN (_source,_target) ORDER BY id FOR UPDATE;
  pv := public.sj_profile_merge_preview(_workspace_id, _source, _target);
  IF _preview_fingerprint IS NULL OR _preview_fingerprint <> pv->>'fingerprint' THEN
    RAISE EXCEPTION 'A prévia mudou ou não foi feita; reveja a prévia antes de consolidar'; END IF;
  IF (pv->>'can_merge')::boolean IS TRUE AND jsonb_array_length(pv->'identity_evidence') = 0
     AND length(coalesce(trim(_evidence_note),'')) < 15 THEN
    pv := jsonb_set(pv, '{blockers}', (pv->'blockers') || '"identity_not_proven"'::jsonb);
    pv := jsonb_set(pv, '{can_merge}', 'false'::jsonb);
  END IF;
  IF (pv->>'can_merge')::boolean IS NOT TRUE THEN
    INSERT INTO public.sj_profile_merges (workspace_id, source_profile_id, target_profile_id, reason, status, blockers, created_by, identity_evidence, evidence_note, preview_fingerprint)
    VALUES (_workspace_id, _source, _target, left(trim(_reason),1000), 'blocked', pv->'blockers', auth.uid(),
      pv->'identity_evidence', nullif(left(trim(coalesce(_evidence_note,'')),1000),''), pv->>'fingerprint') RETURNING id INTO v_merge;
    RETURN jsonb_build_object('status','blocked','merge_id',v_merge,'blockers',pv->'blockers');
  END IF;
  SELECT * INTO s FROM public.sj_profiles WHERE id=_source AND workspace_id=_workspace_id;

  FOREACH tbl IN ARRAY ARRAY['sj_enrollments','sj_touchpoints','sj_tasks','sj_automation_logs','sj_ai_suggestions','sj_course_recommendations'] LOOP
    EXECUTE format('WITH u AS (UPDATE public.%I SET profile_id=$1 WHERE profile_id=$2 AND workspace_id=$3 RETURNING id) SELECT coalesce(jsonb_agg(id),''[]''::jsonb) FROM u', tbl)
      INTO ids USING _target, _source, _workspace_id;
    moved := moved || jsonb_build_object(tbl, ids);
  END LOOP;

  IF s.contact_id IS NOT NULL AND (SELECT p.contact_id FROM public.sj_profiles p WHERE p.id=_target) IS NULL THEN
    v_contact := s.contact_id;
    UPDATE public.sj_profiles SET contact_id = NULL WHERE id=_source AND workspace_id=_workspace_id;
    UPDATE public.sj_profiles SET contact_id = v_contact WHERE id=_target AND workspace_id=_workspace_id;
  END IF;

  UPDATE public.sj_profiles SET archived_at=now(), archived_by=auth.uid(), archive_reason=left(trim(_reason),1000), merged_into_profile_id=_target
   WHERE id=_source AND workspace_id=_workspace_id;
  PERFORM public.sj_recompute_profile_course_stats(_workspace_id, _target);
  PERFORM public.sj_recompute_profile_course_stats(_workspace_id, _source);

  INSERT INTO public.sj_profile_merges (workspace_id, source_profile_id, target_profile_id, reason, moved, source_snapshot, contact_moved_id, created_by, status, identity_evidence, evidence_note, preview_fingerprint)
  VALUES (_workspace_id, _source, _target, left(trim(_reason),1000), moved, to_jsonb(s), v_contact, auth.uid(), 'completed',
    pv->'identity_evidence', nullif(left(trim(coalesce(_evidence_note,'')),1000),''), pv->>'fingerprint') RETURNING id INTO v_merge;
  RETURN jsonb_build_object('status','completed','merge_id', v_merge, 'moved', moved, 'contact_moved', v_contact IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge(uuid,uuid,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge(uuid,uuid,uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sj_profile_merge_revert(_workspace_id uuid, _merge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE m public.sj_profile_merges; tbl text; ids uuid[]; n int;
BEGIN
  IF public.sj_import_is_manager(_workspace_id) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO m FROM public.sj_profile_merges WHERE id=_merge_id AND workspace_id=_workspace_id FOR UPDATE;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Consolidação não encontrada'; END IF;
  IF m.status <> 'completed' THEN RAISE EXCEPTION 'Só consolidações concluídas podem ser revertidas'; END IF;
  IF m.reverted_at IS NOT NULL THEN RAISE EXCEPTION 'Consolidação já revertida'; END IF;
  PERFORM 1 FROM public.sj_profiles WHERE id IN (m.source_profile_id, m.target_profile_id) AND workspace_id=_workspace_id ORDER BY id FOR UPDATE;
  IF (SELECT p.merged_into_profile_id FROM public.sj_profiles p WHERE p.id=m.source_profile_id AND p.workspace_id=_workspace_id) IS DISTINCT FROM m.target_profile_id THEN
    RAISE EXCEPTION 'O perfil de origem já não está arquivado nesta consolidação'; END IF;
  FOR tbl IN SELECT jsonb_object_keys(m.moved) LOOP
    IF tbl NOT IN ('sj_enrollments','sj_touchpoints','sj_tasks','sj_automation_logs','sj_ai_suggestions','sj_course_recommendations') THEN
      RAISE EXCEPTION 'Relação não suportada no registo'; END IF;
    ids := ARRAY(SELECT jsonb_array_elements_text(m.moved->tbl)::uuid);
    EXECUTE format('UPDATE public.%I SET profile_id=$1 WHERE id = ANY($2) AND profile_id=$3 AND workspace_id=$4', tbl)
      USING m.source_profile_id, ids, m.target_profile_id, _workspace_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> cardinality(ids) THEN RAISE EXCEPTION 'Registos de % foram alterados depois da consolidação; reversão cancelada', tbl; END IF;
  END LOOP;
  IF m.contact_moved_id IS NOT NULL THEN
    UPDATE public.sj_profiles SET contact_id=NULL WHERE id=m.target_profile_id AND contact_id=m.contact_moved_id AND workspace_id=_workspace_id;
    UPDATE public.sj_profiles SET contact_id=m.contact_moved_id WHERE id=m.source_profile_id AND workspace_id=_workspace_id;
  END IF;
  UPDATE public.sj_profiles SET archived_at=NULL, archived_by=NULL, archive_reason=NULL, merged_into_profile_id=NULL
   WHERE id=m.source_profile_id AND workspace_id=_workspace_id;
  PERFORM public.sj_recompute_profile_course_stats(_workspace_id, m.source_profile_id);
  PERFORM public.sj_recompute_profile_course_stats(_workspace_id, m.target_profile_id);
  UPDATE public.sj_profile_merges SET reverted_at=now(), reverted_by=auth.uid() WHERE id=m.id;
  RETURN jsonb_build_object('reverted', true);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge_revert(uuid,uuid) FROM PUBLIC, anon;

-- Assinatura antiga sem prévia/prova deixa de ser utilizável.
CREATE OR REPLACE FUNCTION public.sj_profile_merge(_workspace_id uuid, _source uuid, _target uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
BEGIN RAISE EXCEPTION 'Use a consolidação com prévia (impressão digital) e prova de identidade'; END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge_revert(uuid,uuid) TO authenticated;