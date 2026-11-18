-- nif_conflict só com chave real; homónimos (só nome + NIF diferente) não bloqueiam; sem identificador fica em revisão.
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
  contacts_j jsonb; homonyms_j jsonb; profiles_j jsonb; prev jsonb := '{}'::jsonb; prev_raw jsonb;
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
      (v_nif IS NOT NULL AND public.sj_valid_nif(c.tax_id) AND regexp_replace(c.tax_id,'^PT|\s','','gi') <> v_nif) AS nif_differs
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
  , k AS (
    -- chave real = identificador partilhado; nome sozinho é só pista
    SELECT cand.*, (matched_by && ARRAY['nif','email','phone','phone_hint','client_number','previous_import']) AS real_key FROM cand
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'phone',phone,'tax_id',tax_id,
      'client_number',client_number,'entity_type',entity_type,'matched_by',to_jsonb(matched_by),'name_ok',name_ok,
      'nif_conflict',(real_key AND nif_differs)) ORDER BY id) FILTER (WHERE real_key OR NOT nif_differs),'[]'::jsonb),
    -- homónimos: só nome e NIF válido diferente => outra pessoa comprovada, não bloqueia nem associa
    coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'tax_id',tax_id) ORDER BY id) FILTER (WHERE NOT real_key AND nif_differs),'[]'::jsonb)
  INTO contacts_j, homonyms_j FROM k;

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
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(homonyms_j) h WHERE (h->>'id')::uuid = p.contact_id)
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
  IF v_email IS NULL AND v_phone IS NULL AND v_nif IS NULL AND v_num IS NULL AND NOT (prev ? 'contact') THEN
    reasons := reasons || '"no_identifier"'::jsonb; END IF;
  IF jsonb_array_length(homonyms_j) > 0 THEN
    hints := hints || jsonb_build_object('code','homonyms_other_nif','value',jsonb_array_length(homonyms_j));
    -- sem ficha corroborada por chave real: homónimo exige decisão auditada «é outra pessoa»
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') ?| ARRAY['nif','email','phone','phone_hint','client_number','previous_import']) THEN
      reasons := reasons || '"homonym_other_nif"'::jsonb; END IF;
  END IF;
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
    'contacts', contacts_j, 'homonyms', homonyms_j, 'profiles', profiles_j, 'previous', prev,
    'row_fingerprint', v_row_fp, 'candidate_fingerprint', v_cand_fp,
    'auto_contact_id', CASE WHEN status='match' THEN v_contact END,
    'auto_profile_id', CASE WHEN status='match' THEN v_profile END);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_classify(uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;