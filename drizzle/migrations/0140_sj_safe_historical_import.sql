-- ============ Jornada do Aluno: importação histórica segura (aditivo) ============

-- 1) Colunas aditivas
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS archive_reason text;
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS merged_into_profile_id uuid REFERENCES public.sj_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sj_profiles_active_ws_idx ON public.sj_profiles (workspace_id) WHERE archived_at IS NULL;
COMMENT ON COLUMN public.sj_profiles.source IS 'Origem de criação do perfil; proveniência detalhada em sj_import_provenance';

ALTER TABLE public.sj_enrollments ADD COLUMN IF NOT EXISTS financial_unknown boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.sj_enrollments.financial_unknown IS 'true = sem informação financeira (Não informado); montantes NULL não significam zero';
ALTER TABLE public.sj_enrollments DROP CONSTRAINT IF EXISTS sj_enrollments_payment_check;
ALTER TABLE public.sj_enrollments ADD CONSTRAINT sj_enrollments_payment_check
  CHECK (payment_status = ANY (ARRAY['unpaid','paid','partial','refunded','unknown']));

-- 2) Proveniência auditável
CREATE TABLE IF NOT EXISTS public.sj_import_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_id uuid,
  source_label text NOT NULL,
  file_name text,
  file_hash text NOT NULL,
  sheet_name text NOT NULL DEFAULT '',
  row_ref text NOT NULL,
  cells jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_type text NOT NULL CHECK (entity_type IN ('contact','profile','enrollment')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created','reused','linked','evidence')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, file_hash, sheet_name, row_ref, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS sj_import_prov_entity_idx ON public.sj_import_provenance (workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS sj_import_prov_label_idx ON public.sj_import_provenance (workspace_id, source_label);
GRANT SELECT ON public.sj_import_provenance TO authenticated;
GRANT ALL ON public.sj_import_provenance TO service_role;
ALTER TABLE public.sj_import_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros leem proveniência" ON public.sj_import_provenance FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

-- 3) Mapa explícito designação -> edição
CREATE TABLE IF NOT EXISTS public.sj_import_label_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label_raw text NOT NULL,
  label_norm text NOT NULL,
  course_id uuid NOT NULL REFERENCES public.sj_courses(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.sj_cohorts(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, label_norm)
);
GRANT SELECT ON public.sj_import_label_maps TO authenticated;
GRANT ALL ON public.sj_import_label_maps TO service_role;
ALTER TABLE public.sj_import_label_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestão lê mapa de designações" ON public.sj_import_label_maps FOR SELECT TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','secretaria']));

-- 4) Registo de consolidações
CREATE TABLE IF NOT EXISTS public.sj_profile_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_profile_id uuid NOT NULL REFERENCES public.sj_profiles(id),
  target_profile_id uuid NOT NULL REFERENCES public.sj_profiles(id),
  reason text NOT NULL,
  moved jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_moved_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz,
  reverted_by uuid
);
GRANT SELECT ON public.sj_profile_merges TO authenticated;
GRANT ALL ON public.sj_profile_merges TO service_role;
ALTER TABLE public.sj_profile_merges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestão lê consolidações" ON public.sj_profile_merges FOR SELECT TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','secretaria']));

-- 5) Normalizadores (puros; espelhados em src/lib/studentJourney/importReconciliation.ts)
CREATE OR REPLACE FUNCTION public.sj_norm_text(_s text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT nullif(trim(regexp_replace(lower(translate(coalesce(_s,''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '[^a-z0-9]+', ' ', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.sj_norm_phone(_s text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE s text := trim(coalesce(_s,'')); d text; intl boolean;
BEGIN
  IF s = '' THEN RETURN NULL; END IF;
  d := regexp_replace(s, '\D', '', 'g');
  intl := left(s,1) = '+';
  IF left(d,2) = '00' THEN d := substr(d,3); intl := true; END IF;
  IF length(d) < 7 THEN RETURN NULL; END IF;
  IF intl THEN
    RETURN '+' || d;
  END IF;
  IF length(d) = 9 AND left(d,1) IN ('2','3','9') THEN RETURN '+351' || d; END IF;
  IF length(d) = 12 AND left(d,3) = '351' THEN RETURN '+' || d; END IF;
  RETURN 'local:' || d; -- sem indicativo e não português: só coincide com igual exato
END $$;

CREATE OR REPLACE FUNCTION public.sj_valid_nif(_s text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE d text := regexp_replace(coalesce(_s,''), '^PT', '', 'i'); s int := 0; c int; i int;
BEGIN
  d := regexp_replace(d, '\s', '', 'g');
  IF d !~ '^\d{9}$' OR left(d,1) = '0' THEN RETURN false; END IF;
  FOR i IN 1..8 LOOP s := s + substr(d,i,1)::int * (10 - i); END LOOP;
  c := 11 - (s % 11); IF c >= 10 THEN c := 0; END IF;
  RETURN c = substr(d,9,1)::int;
END $$;

CREATE OR REPLACE FUNCTION public.sj_nif_kind(_s text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN NOT public.sj_valid_nif(_s) THEN NULL
    WHEN left(regexp_replace(regexp_replace(_s,'^PT','','i'),'\s','','g'),1) IN ('1','2','3')
      OR left(regexp_replace(regexp_replace(_s,'^PT','','i'),'\s','','g'),2) = '45' THEN 'person'
    ELSE 'company' END
$$;

CREATE OR REPLACE FUNCTION public.sj_names_compatible(_a text, _b text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE ta text[]; tb text[];
BEGIN
  ta := array_remove(string_to_array(coalesce(public.sj_norm_text(_a),''),' '), '');
  tb := array_remove(string_to_array(coalesce(public.sj_norm_text(_b),''),' '), '');
  ta := ARRAY(SELECT x FROM unnest(ta) x WHERE length(x) > 2);
  tb := ARRAY(SELECT x FROM unnest(tb) x WHERE length(x) > 2);
  IF cardinality(ta) = 0 OR cardinality(tb) = 0 THEN RETURN false; END IF;
  IF ta[1] <> tb[1] THEN RETURN false; END IF;
  IF cardinality(ta) = 1 OR cardinality(tb) = 1 THEN RETURN true; END IF;
  RETURN ta[cardinality(ta)] = ANY(tb) OR tb[cardinality(tb)] = ANY(ta);
END $$;

-- 6) Classificação de uma linha (servidor é autoritativo)
CREATE OR REPLACE FUNCTION public.sj_import_classify(_workspace_id uuid, _row jsonb, _file_hash text DEFAULT NULL, _sheet text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_name text := nullif(trim(left(_row->>'full_name',200)),'');
  v_email_raw text := nullif(trim(left(_row->>'email',255)),'');
  v_phone_raw text := nullif(trim(left(_row->>'phone',60)),'');
  v_nif_raw text := nullif(regexp_replace(coalesce(_row->>'nif',''),'\s','','g'),'');
  v_num text := nullif(trim(left(_row->>'client_number',50)),'');
  v_email text; v_phone text; v_nif text; v_phone_hint text;
  hints jsonb := '[]'::jsonb; reasons jsonb := '[]'::jsonb;
  contacts_j jsonb; profiles_j jsonb; prev jsonb;
  n_contacts int; n_strong_ok int; n_profiles int; status text;
  v_contact uuid; v_profile uuid;
BEGIN
  -- e-mail: só se tiver formato de e-mail; telefone no campo e-mail é pista
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

  -- Reimportação do mesmo ficheiro/linha: reutiliza o que já foi criado/associado
  IF _file_hash IS NOT NULL THEN
    SELECT jsonb_object_agg(entity_type, entity_id) INTO prev FROM (
      SELECT DISTINCT ON (entity_type) entity_type, entity_id FROM sj_import_provenance
      WHERE workspace_id=_workspace_id AND file_hash=_file_hash AND sheet_name=coalesce(_sheet,'') AND row_ref=_row->>'source_row'
        AND entity_type IN ('contact','profile') ORDER BY entity_type, created_at) q;
  END IF;

  WITH cand AS (
    SELECT c.id, c.name, c.email, c.phone, c.tax_id, c.client_number, c.entity_type,
      array_remove(ARRAY[
        CASE WHEN v_nif IS NOT NULL AND regexp_replace(coalesce(c.tax_id,''),'^PT|\s','','gi') = v_nif THEN 'nif' END,
        CASE WHEN v_email IS NOT NULL AND lower(trim(c.email)) = v_email THEN 'email' END,
        CASE WHEN v_phone IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone THEN 'phone' END,
        CASE WHEN v_phone_hint IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone_hint THEN 'phone_hint' END,
        CASE WHEN v_num IS NOT NULL AND c.client_number = v_num THEN 'client_number' END,
        CASE WHEN v_email IS NULL AND v_phone IS NULL AND v_nif IS NULL AND v_num IS NULL
              AND public.sj_norm_text(c.name) = public.sj_norm_text(v_name) THEN 'name_only' END
      ], NULL) AS matched_by,
      public.sj_names_compatible(c.name, v_name) AS name_ok,
      (v_nif IS NOT NULL AND public.sj_valid_nif(c.tax_id) AND regexp_replace(c.tax_id,'^PT|\s','','gi') <> v_nif) AS nif_conflict
    FROM contacts c
    WHERE c.workspace_id=_workspace_id AND c.deleted_at IS NULL AND (
      (v_nif IS NOT NULL AND regexp_replace(coalesce(c.tax_id,''),'^PT|\s','','gi') = v_nif)
      OR (v_email IS NOT NULL AND lower(trim(c.email)) = v_email)
      OR (v_phone IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone)
      OR (v_phone_hint IS NOT NULL AND public.sj_norm_phone(c.phone) = v_phone_hint)
      OR (v_num IS NOT NULL AND c.client_number = v_num)
      OR (v_email IS NULL AND v_phone IS NULL AND v_nif IS NULL AND v_num IS NULL
          AND public.sj_norm_text(c.name) = public.sj_norm_text(v_name))
      OR (prev ? 'contact' AND c.id = (prev->>'contact')::uuid))
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'phone',phone,'tax_id',tax_id,
    'client_number',client_number,'entity_type',entity_type,'matched_by',to_jsonb(matched_by),'name_ok',name_ok,
    'nif_conflict',nif_conflict,'previous_import', prev ? 'contact' AND id=(prev->>'contact')::uuid) ORDER BY id),'[]'::jsonb)
  INTO contacts_j FROM cand;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'phone',p.phone,
      'contact_id',p.contact_id,'name_ok',public.sj_names_compatible(p.full_name,v_name),
      'enrollments',(SELECT count(*) FROM sj_enrollments e WHERE e.profile_id=p.id)) ORDER BY p.id),'[]'::jsonb)
  INTO profiles_j FROM sj_profiles p
  WHERE p.workspace_id=_workspace_id AND p.archived_at IS NULL AND (
    p.contact_id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(contacts_j) x)
    OR (v_email IS NOT NULL AND lower(trim(p.email)) = v_email)
    OR (v_phone IS NOT NULL AND (public.sj_norm_phone(p.phone) = v_phone OR public.sj_norm_phone(p.email) = v_phone))
    OR (v_phone_hint IS NOT NULL AND (public.sj_norm_phone(p.phone) = v_phone_hint OR public.sj_norm_phone(p.email) = v_phone_hint))
    OR (v_email IS NULL AND v_phone IS NULL AND v_nif IS NULL AND v_num IS NULL AND p.contact_id IS NULL
        AND public.sj_norm_text(p.full_name) = public.sj_norm_text(v_name))
    OR (prev ? 'profile' AND p.id = (prev->>'profile')::uuid));

  n_contacts := jsonb_array_length(contacts_j);
  n_profiles := jsonb_array_length(profiles_j);
  SELECT count(*) INTO n_strong_ok FROM jsonb_array_elements(contacts_j) x
   WHERE (x->>'name_ok')::boolean AND NOT (x->>'nif_conflict')::boolean
     AND (x->'matched_by') ?| ARRAY['nif','email','phone','client_number'];

  IF v_name IS NULL THEN reasons := reasons || '"missing_name"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE NOT (x->>'name_ok')::boolean) THEN
    reasons := reasons || '"identifier_name_mismatch"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->>'nif_conflict')::boolean) THEN
    reasons := reasons || '"shared_identifier_different_nif"'::jsonb; END IF;
  IF n_contacts > 1 THEN reasons := reasons || '"multiple_contacts"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') ? 'name_only') THEN
    reasons := reasons || '"name_only"'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(contacts_j) x WHERE (x->'matched_by') ? 'phone_hint'
             AND NOT (x->'matched_by') ?| ARRAY['nif','email','phone','client_number']) THEN
    reasons := reasons || '"phone_hint_only"'::jsonb; END IF;

  IF n_contacts = 1 AND n_strong_ok = 1 AND jsonb_array_length(reasons) = 0 THEN
    v_contact := (contacts_j->0->>'id')::uuid;
    -- perfis candidatos têm de estar todos ligados a este contacto
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

  RETURN jsonb_build_object('source_row', _row->>'source_row', 'status', status, 'reasons', reasons, 'hints', hints,
    'normalized', jsonb_build_object('email',v_email,'phone',v_phone,'nif',v_nif,'client_number',v_num),
    'contacts', contacts_j, 'profiles', profiles_j, 'previous', coalesce(prev,'{}'::jsonb),
    'auto_contact_id', CASE WHEN status='match' THEN v_contact END,
    'auto_profile_id', CASE WHEN status='match' THEN v_profile END);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_classify(uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;

-- 7) Decisão validada: devolve contact/profile canónicos ou motivo de pendência
CREATE OR REPLACE FUNCTION public.sj_import_resolve(_cls jsonb, _decision jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE st text := _cls->>'status'; dc text := _decision->>'contact'; dp text := _decision->>'profile';
  c_ids text[]; p_ok boolean; prof jsonb;
BEGIN
  IF st = 'invalid' THEN RETURN jsonb_build_object('pending','invalid_row'); END IF;
  IF coalesce((_decision->>'pending')::boolean,false) THEN RETURN jsonb_build_object('pending','marked_pending'); END IF;
  c_ids := ARRAY(SELECT x->>'id' FROM jsonb_array_elements(_cls->'contacts') x);
  IF dc IS NULL AND dp IS NULL AND (_cls->'previous') ? 'contact' AND (_cls->'previous') ? 'profile' THEN
    RETURN jsonb_build_object('contact',_cls->'previous'->>'contact','profile',_cls->'previous'->>'profile','previous',true);
  END IF;
  IF dc IS NULL AND dp IS NULL THEN
    IF st = 'new' THEN RETURN jsonb_build_object('contact','new','profile','new'); END IF;
    IF st = 'match' THEN RETURN jsonb_build_object('contact',_cls->>'auto_contact_id','profile',coalesce(_cls->>'auto_profile_id','new')); END IF;
    RETURN jsonb_build_object('pending','needs_decision');
  END IF;
  IF dc IS NULL OR dp IS NULL THEN RETURN jsonb_build_object('pending','incomplete_decision'); END IF;
  IF dc <> 'new' AND NOT dc = ANY(c_ids) THEN RETURN jsonb_build_object('pending','contact_not_candidate'); END IF;
  IF dp = 'new' THEN
    IF jsonb_array_length(_cls->'profiles') > 0 THEN RETURN jsonb_build_object('pending','profile_candidates_exist'); END IF;
  ELSE
    SELECT x INTO prof FROM jsonb_array_elements(_cls->'profiles') x WHERE x->>'id' = dp;
    IF prof IS NULL THEN RETURN jsonb_build_object('pending','profile_not_candidate'); END IF;
    IF prof->>'contact_id' IS NOT NULL AND (dc = 'new' OR prof->>'contact_id' <> dc) THEN
      RETURN jsonb_build_object('pending','profile_linked_to_other_contact'); END IF;
    -- o contacto escolhido não pode já ter outro perfil
    IF dc <> 'new' AND EXISTS (SELECT 1 FROM jsonb_array_elements(_cls->'profiles') x WHERE x->>'contact_id' = dc AND x->>'id' <> dp) THEN
      RETURN jsonb_build_object('pending','contact_has_other_profile'); END IF;
  END IF;
  IF dc <> 'new' AND dp = 'new' AND EXISTS (SELECT 1 FROM jsonb_array_elements(_cls->'profiles') x WHERE x->>'contact_id' = dc) THEN
    RETURN jsonb_build_object('pending','contact_has_profile'); END IF;
  RETURN jsonb_build_object('contact',dc,'profile',dp);
END $$;
REVOKE ALL ON FUNCTION public.sj_import_resolve(jsonb,jsonb) FROM PUBLIC, anon;

-- 8) Prévia (só leitura)
CREATE OR REPLACE FUNCTION public.sj_import_preview(_workspace_id uuid, _cohort_id uuid, _batch jsonb, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; cls jsonb; res jsonb; out jsonb := '[]'::jsonb; v_course uuid; v_hash text := nullif(_batch->>'file_hash','');
  v_sheet text := coalesce(_batch->>'sheet_name',''); pid uuid; legacy jsonb; same jsonb; lbl jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN
    RAISE EXCEPTION 'Sem permissão para importar históricos'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 500 THEN RAISE EXCEPTION 'Máximo 500 linhas por pedido'; END IF;
  IF _cohort_id IS NOT NULL THEN
    SELECT course_id INTO v_course FROM sj_cohorts WHERE id=_cohort_id AND workspace_id=_workspace_id;
    IF v_course IS NULL THEN RAISE EXCEPTION 'Edição inválida para esta organização'; END IF;
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    cls := public.sj_import_classify(_workspace_id, r, v_hash, v_sheet);
    res := public.sj_import_resolve(cls, coalesce(r->'decision','{}'::jsonb));
    legacy := '[]'::jsonb; same := '[]'::jsonb;
    pid := CASE WHEN res->>'profile' ~ '^[0-9a-f-]{36}$' THEN (res->>'profile')::uuid END;
    IF v_course IS NOT NULL THEN
      SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'profile_id',e.profile_id,'pedagogic_status',e.pedagogic_status,'admin_status',e.admin_status,'created_at',e.created_at)),'[]'::jsonb)
        INTO legacy FROM sj_enrollments e
       WHERE e.workspace_id=_workspace_id AND e.course_id=v_course AND e.cohort_id IS NULL AND coalesce(e.admin_status,'') <> 'cancelled'
         AND e.profile_id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(cls->'profiles') x);
      SELECT coalesce(jsonb_agg(e.id),'[]'::jsonb) INTO same FROM sj_enrollments e
       WHERE e.workspace_id=_workspace_id AND e.cohort_id=_cohort_id AND e.profile_id = pid;
    END IF;
    SELECT jsonb_agg(jsonb_build_object('label',l,'mapped_cohort_id',m.cohort_id,'mapped_course_id',m.course_id))
      INTO lbl FROM jsonb_array_elements_text(coalesce(r->'labels','[]'::jsonb)) l
      LEFT JOIN sj_import_label_maps m ON m.workspace_id=_workspace_id AND m.label_norm = public.sj_norm_text(l);
    out := out || (cls || jsonb_build_object('resolution',res,'legacy_enrollments',legacy,'existing_in_cohort',same,'labels',coalesce(lbl,'[]'::jsonb)));
  END LOOP;
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.sj_import_preview(uuid,uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_import_preview(uuid,uuid,jsonb,jsonb) TO authenticated;

-- 9) Mapa de designações (escrita só por RPC)
CREATE OR REPLACE FUNCTION public.sj_import_set_label_map(_workspace_id uuid, _label text, _course_id uuid, _cohort_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_norm text := public.sj_norm_text(_label);
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_norm IS NULL OR length(_label) > 300 THEN RAISE EXCEPTION 'Designação inválida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM sj_courses WHERE id=_course_id AND workspace_id=_workspace_id) THEN RAISE EXCEPTION 'Curso inválido'; END IF;
  IF _cohort_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sj_cohorts WHERE id=_cohort_id AND workspace_id=_workspace_id AND course_id=_course_id) THEN
    RAISE EXCEPTION 'Edição não pertence ao curso'; END IF;
  INSERT INTO sj_import_label_maps (workspace_id,label_raw,label_norm,course_id,cohort_id,created_by)
  VALUES (_workspace_id,_label,v_norm,_course_id,_cohort_id,auth.uid())
  ON CONFLICT (workspace_id,label_norm) DO UPDATE SET label_raw=EXCLUDED.label_raw, course_id=EXCLUDED.course_id,
    cohort_id=EXCLUDED.cohort_id, updated_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.sj_import_set_label_map(uuid,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_import_set_label_map(uuid,text,uuid,uuid) TO authenticated;
-- 10) Importação histórica com conciliação validada no servidor (uma edição por execução)
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

  -- Serializa importações do mesmo workspace (evita corridas entre execuções)
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

      -- Designações: só correspondência exata no mapa explícito para esta edição
      IF jsonb_typeof(r->'labels') = 'array' AND jsonb_array_length(r->'labels') > 0 THEN
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(r->'labels') l JOIN sj_import_label_maps m
             ON m.workspace_id=_workspace_id AND m.label_norm=public.sj_norm_text(l) AND m.cohort_id=_cohort_id) THEN
          pend := pend || jsonb_build_object('row',v_row,'reason','label_not_mapped_to_cohort'); CONTINUE;
        END IF;
      END IF;

      v_cells := CASE WHEN jsonb_typeof(r->'cells')='object' AND length((r->'cells')::text) < 8000 THEN r->'cells' ELSE '{}'::jsonb END;

      -- Contacto
      IF res->>'contact' = 'new' THEN
        INSERT INTO contacts (workspace_id, name, email, phone, tax_id, client_number, source, lead_source)
        VALUES (_workspace_id, left(trim(r->>'full_name'),200), cls->'normalized'->>'email',
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
        -- origem de aquisição anterior preservada; acrescenta só evidência
        INSERT INTO sj_import_provenance (workspace_id,job_id,source_label,file_name,file_hash,sheet_name,row_ref,cells,entity_type,entity_id,action,created_by)
        VALUES (_workspace_id,v_job,v_label,v_file,v_hash,v_sheet,v_row,v_cells,'contact',v_contact,'reused',auth.uid()) ON CONFLICT DO NOTHING;
      END IF;

      -- Perfil
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

      -- Inscrição
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
          -- desfaz o que foi criado nesta linha (o perfil/contacto novos não ficam sem inscrição)
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
      -- a subtransação desta linha é revertida por inteiro (contadores incluídos abaixo)
      IF SQLERRM LIKE 'PENDING:%' THEN pend := pend || jsonb_build_object('row',v_row,'reason',substr(SQLERRM,9));
      ELSE errs := errs || jsonb_build_object('row',v_row,'error',SQLERRM); END IF;
    END;
  END LOOP;

  -- Contadores fiáveis: contam só o que ficou registado nesta execução
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

-- A versão antiga escolhia o registo mais recente e marcava finanças como não pagas: desativada.
CREATE OR REPLACE FUNCTION public.sj_import_historical_rows(_workspace_id uuid, _cohort_id uuid, _dedupe_key text, _rows jsonb, _file_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Esta versão da importação foi desativada. Use a importação com prévia de conciliação.';
END $$;
COMMENT ON FUNCTION public.sj_import_historical_rows(uuid,uuid,text,jsonb,text) IS 'DEPRECATED: replaced by sj_import_historical_rows(uuid,uuid,jsonb,jsonb)';
-- 11) Consolidação segura de perfis (prévia obrigatória, transacional, auditada, reversível)
CREATE OR REPLACE FUNCTION public.sj_profile_merge_preview(_workspace_id uuid, _source uuid, _target uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s sj_profiles; t sj_profiles; blockers jsonb := '[]'::jsonb; deps jsonb := '{}'::jsonb; rec record; n bigint;
  supported text[] := ARRAY['sj_enrollments','sj_touchpoints','sj_tasks','sj_automation_logs','sj_ai_suggestions','sj_course_recommendations','sj_profiles','sj_profile_merges'];
  coincident jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO s FROM sj_profiles WHERE id=_source AND workspace_id=_workspace_id;
  SELECT * INTO t FROM sj_profiles WHERE id=_target AND workspace_id=_workspace_id;
  IF s.id IS NULL OR t.id IS NULL THEN RAISE EXCEPTION 'Perfis não pertencem a esta organização'; END IF;
  IF _source = _target THEN blockers := blockers || '"same_profile"'::jsonb; END IF;
  IF s.archived_at IS NOT NULL OR t.archived_at IS NOT NULL THEN blockers := blockers || '"archived_profile"'::jsonb; END IF;
  IF s.contact_id IS NOT NULL AND t.contact_id IS NOT NULL AND s.contact_id <> t.contact_id THEN
    blockers := blockers || '"different_contacts"'::jsonb; END IF;

  -- Qualquer relação a sj_profiles fora das suportadas com dados bloqueia
  FOR rec IN SELECT DISTINCT cl.relname::text AS tbl, a.attname::text AS col FROM pg_constraint c
      JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=cl.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum = ANY(c.conkey)
     WHERE c.contype='f' AND c.confrelid='public.sj_profiles'::regclass
    UNION SELECT table_name::text, column_name::text FROM information_schema.columns
     WHERE table_schema='public' AND column_name IN ('profile_id','sj_profile_id') AND table_name LIKE 'sj\_%'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', rec.tbl, rec.col) INTO n USING _source;
    IF rec.tbl = 'sj_profiles' OR rec.tbl = 'sj_profile_merges' THEN CONTINUE; END IF;
    deps := deps || jsonb_build_object(rec.tbl || '.' || rec.col, n);
    IF n > 0 AND NOT (rec.tbl = ANY(supported) AND rec.col = 'profile_id') THEN
      blockers := blockers || to_jsonb('unsupported_relation:' || rec.tbl || '.' || rec.col); END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(jsonb_build_object('source_enrollment',a.id,'target_enrollment',b.id,'course_id',a.course_id,'cohort_id',a.cohort_id)),'[]'::jsonb)
    INTO coincident FROM sj_enrollments a JOIN sj_enrollments b
      ON b.profile_id=_target AND b.course_id=a.course_id AND b.cohort_id IS NOT DISTINCT FROM a.cohort_id
   WHERE a.profile_id=_source;
  IF jsonb_array_length(coincident) > 0 THEN blockers := blockers || '"coincident_enrollments"'::jsonb; END IF;

  deps := deps || jsonb_build_object(
    'attendance', (SELECT count(*) FROM sj_attendance x JOIN sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'certificates', (SELECT count(*) FROM sj_certificates x JOIN sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'installments', (SELECT count(*) FROM sj_installments x JOIN sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'payments', (SELECT count(*) FROM sj_enrollment_payments x JOIN sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'invoice_links', (SELECT count(*) FROM sj_enrollment_invoices x JOIN sj_enrollments e ON e.id=x.enrollment_id WHERE e.profile_id=_source),
    'provenance', (SELECT count(*) FROM sj_import_provenance WHERE entity_type='profile' AND entity_id=_source));

  RETURN jsonb_build_object('source', jsonb_build_object('id',s.id,'full_name',s.full_name,'email',s.email,'phone',s.phone,'contact_id',s.contact_id),
    'target', jsonb_build_object('id',t.id,'full_name',t.full_name,'email',t.email,'phone',t.phone,'contact_id',t.contact_id),
    'names_compatible', public.sj_names_compatible(s.full_name, t.full_name),
    'dependencies', deps, 'coincident_enrollments', coincident, 'blockers', blockers,
    'can_merge', jsonb_array_length(blockers) = 0);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge_preview(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge_preview(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sj_profile_merge(_workspace_id uuid, _source uuid, _target uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pv jsonb; moved jsonb := '{}'::jsonb; ids jsonb; v_merge uuid; s sj_profiles; v_contact uuid; tbl text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(coalesce(trim(_reason),'')) < 5 OR length(_reason) > 1000 THEN RAISE EXCEPTION 'Motivo obrigatório (5 a 1000 caracteres)'; END IF;
  -- bloqueia ambos os perfis por ordem estável
  PERFORM 1 FROM sj_profiles WHERE id IN (_source,_target) AND workspace_id=_workspace_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM sj_enrollments WHERE profile_id IN (_source,_target) FOR UPDATE;
  pv := public.sj_profile_merge_preview(_workspace_id, _source, _target);
  IF NOT (pv->>'can_merge')::boolean THEN
    RAISE EXCEPTION 'Consolidação bloqueada: %', pv->'blockers';
  END IF;
  SELECT * INTO s FROM sj_profiles WHERE id=_source;

  FOREACH tbl IN ARRAY ARRAY['sj_enrollments','sj_touchpoints','sj_tasks','sj_automation_logs','sj_ai_suggestions','sj_course_recommendations'] LOOP
    EXECUTE format('WITH u AS (UPDATE public.%I SET profile_id=$1 WHERE profile_id=$2 RETURNING id) SELECT coalesce(jsonb_agg(id),''[]''::jsonb) FROM u', tbl)
      INTO ids USING _target, _source;
    moved := moved || jsonb_build_object(tbl, ids);
  END LOOP;

  IF s.contact_id IS NOT NULL AND (SELECT contact_id FROM sj_profiles WHERE id=_target) IS NULL THEN
    v_contact := s.contact_id;
    UPDATE sj_profiles SET contact_id = NULL WHERE id=_source;
    UPDATE sj_profiles SET contact_id = v_contact WHERE id=_target;
  END IF;

  UPDATE sj_profiles SET archived_at=now(), archived_by=auth.uid(), archive_reason=left(_reason,1000), merged_into_profile_id=_target
   WHERE id=_source;
  UPDATE sj_profiles SET total_courses_completed = (SELECT count(*) FROM sj_enrollments WHERE profile_id=_target AND status='completed'),
    last_course_completed_at = (SELECT max(completed_at) FROM sj_enrollments WHERE profile_id=_target AND status='completed')
   WHERE id=_target;

  INSERT INTO sj_profile_merges (workspace_id, source_profile_id, target_profile_id, reason, moved, source_snapshot, contact_moved_id, created_by)
  VALUES (_workspace_id, _source, _target, left(_reason,1000), moved, to_jsonb(s), v_contact, auth.uid()) RETURNING id INTO v_merge;
  RETURN jsonb_build_object('merge_id', v_merge, 'moved', moved, 'contact_moved', v_contact IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge(uuid,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge(uuid,uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sj_profile_merge_revert(_workspace_id uuid, _merge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m sj_profile_merges; tbl text; ids uuid[]; n int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.sj_has_any_role(_workspace_id, ARRAY['gestao','secretaria']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO m FROM sj_profile_merges WHERE id=_merge_id AND workspace_id=_workspace_id FOR UPDATE;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Consolidação não encontrada'; END IF;
  IF m.reverted_at IS NOT NULL THEN RAISE EXCEPTION 'Consolidação já revertida'; END IF;
  PERFORM 1 FROM sj_profiles WHERE id IN (m.source_profile_id, m.target_profile_id) ORDER BY id FOR UPDATE;
  IF (SELECT merged_into_profile_id FROM sj_profiles WHERE id=m.source_profile_id) IS DISTINCT FROM m.target_profile_id THEN
    RAISE EXCEPTION 'O perfil de origem já não está arquivado nesta consolidação'; END IF;
  FOR tbl IN SELECT jsonb_object_keys(m.moved) LOOP
    ids := ARRAY(SELECT jsonb_array_elements_text(m.moved->tbl)::uuid);
    EXECUTE format('UPDATE public.%I SET profile_id=$1 WHERE id = ANY($2) AND profile_id=$3', tbl) USING m.source_profile_id, ids, m.target_profile_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> cardinality(ids) THEN RAISE EXCEPTION 'Registos de % foram alterados depois da consolidação; reversão cancelada', tbl; END IF;
  END LOOP;
  IF m.contact_moved_id IS NOT NULL THEN
    UPDATE sj_profiles SET contact_id=NULL WHERE id=m.target_profile_id AND contact_id=m.contact_moved_id;
    UPDATE sj_profiles SET contact_id=m.contact_moved_id WHERE id=m.source_profile_id;
  END IF;
  UPDATE sj_profiles SET archived_at=NULL, archived_by=NULL, archive_reason=NULL, merged_into_profile_id=NULL WHERE id=m.source_profile_id;
  UPDATE sj_profiles p SET total_courses_completed = (SELECT count(*) FROM sj_enrollments WHERE profile_id=p.id AND status='completed')
   WHERE p.id IN (m.source_profile_id, m.target_profile_id);
  UPDATE sj_profile_merges SET reverted_at=now(), reverted_by=auth.uid() WHERE id=m.id;
  RETURN jsonb_build_object('reverted', true);
END $$;
REVOKE ALL ON FUNCTION public.sj_profile_merge_revert(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_profile_merge_revert(uuid,uuid) TO authenticated;