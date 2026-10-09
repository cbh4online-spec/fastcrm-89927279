-- Identity checks are repeated inside the same transaction that creates a lead.
-- The advisory lock serializes this RPC per workspace; callers cannot turn an
-- old search result into a duplicate while another RPC import is in progress.
CREATE OR REPLACE FUNCTION public.prospecting_identity_key(p_value text, p_kind text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v text;
BEGIN
  v := lower(btrim(coalesce(p_value, '')));
  IF v = '' THEN RETURN NULL; END IF;
  IF p_kind = 'email' THEN RETURN v; END IF;
  IF p_kind = 'phone' THEN
    v := regexp_replace(v, '[^0-9]', '', 'g');
    RETURN CASE WHEN length(v) >= 9 THEN right(v, 9) ELSE NULL END;
  END IF;
  IF p_kind = 'name' THEN
    RETURN nullif(regexp_replace(
      translate(v, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+', ' ', 'g'), '');
  END IF;
  IF p_kind = 'url' OR p_kind = 'domain' OR p_kind = 'profile' THEN
    IF p_kind = 'profile' AND left(v, 1) = '@' THEN
      RETURN 'instagram:' || substring(v from 2);
    END IF;
    v := regexp_replace(v, '^[a-z][a-z0-9+.-]*://', '');
    v := regexp_replace(v, '^www\.', '');
    v := split_part(split_part(v, '?', 1), '#', 1);
    v := regexp_replace(v, '/+$', '');
    IF v ~ '^(m\.)?instagram\.com/' THEN
      RETURN 'instagram:' || split_part(split_part(v, '/', 2), '/', 1);
    END IF;
    IF p_kind = 'profile' THEN RETURN nullif(v, ''); END IF;
    IF p_kind = 'url' THEN RETURN nullif(v, ''); END IF;
    v := split_part(v, '/', 1);
    v := split_part(v, ':', 1);
    IF v ~ '(^|\.)(instagram\.com|facebook\.com|linkedin\.com|google\.com|yelp\.com|tripadvisor\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linktr\.ee|wa\.me)$' THEN
      RETURN NULL;
    END IF;
    RETURN nullif(v, '');
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.prospecting_identity_check(
  p_workspace_id uuid, p_candidate jsonb, p_profile_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_matches jsonb; v_status text; v_has_strong_identifier boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso ao espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF p_candidate IS NULL OR jsonb_typeof(p_candidate) <> 'object' THEN
    RAISE EXCEPTION 'Candidato inválido';
  END IF;
  v_has_strong_identifier :=
    public.prospecting_identity_key(p_candidate->>'email','email') IS NOT NULL
    OR public.prospecting_identity_key(p_candidate->>'phone','phone') IS NOT NULL
    OR public.prospecting_identity_key(p_candidate->>'website','url') IS NOT NULL
    OR public.prospecting_identity_key(coalesce(p_candidate->>'instagram_url',p_candidate->>'profile_url'),'profile') IS NOT NULL
    OR nullif(btrim(p_candidate->>'google_place_id'),'') IS NOT NULL;

  WITH candidate AS (
    SELECT public.prospecting_identity_key(p_candidate->>'email','email') AS email_key,
      public.prospecting_identity_key(p_candidate->>'phone','phone') AS phone_key,
      public.prospecting_identity_key(p_candidate->>'website','url') AS url_key,
      public.prospecting_identity_key(p_candidate->>'website','domain') AS domain_key,
      public.prospecting_identity_key(coalesce(p_candidate->>'instagram_url',p_candidate->>'profile_url',p_candidate->>'website'),'profile') AS profile_key,
      public.prospecting_identity_key(p_candidate->>'name','name') AS name_key,
      nullif(btrim(p_candidate->>'google_place_id'),'') AS place_key
  ), entities AS (
    SELECT 'lead' AS entity_type, l.id, l.name, l.email, coalesce(l.external_email,l.preferred_contact_email) AS alt_email,
      l.phone, l.preferred_contact_phone AS alt_phone, l.website, NULL::text AS alt_domain,
      l.instagram_url, l.google_place_id, l.is_blocked, l.city, l.prospecting_profile_id
      FROM public.leads l WHERE l.workspace_id = p_workspace_id
    UNION ALL
    SELECT 'contact', c.id, c.name, c.email, c.preferred_contact_email,
      c.phone, coalesce(c.whatsapp_number,c.preferred_contact_phone), c.website, NULL::text,
      c.instagram_url, NULL::text, c.is_blocked, c.city, NULL::uuid
      FROM public.contacts c WHERE c.workspace_id = p_workspace_id AND c.deleted_at IS NULL
    UNION ALL
    SELECT 'company', co.id, co.name, co.email, co.preferred_contact_email,
      co.phone, co.preferred_contact_phone, co.website, co.domain, co.instagram_url, co.google_place_id,
      co.is_blocked, co.city, NULL::uuid
      FROM public.companies co WHERE co.workspace_id = p_workspace_id AND co.deleted_at IS NULL
    UNION ALL
    SELECT 'profile', pr.id, coalesce(pr.profile_name,pr.instagram_username),
      pr.extracted_email, NULL::text, pr.extracted_phone, NULL::text, pr.profile_url, NULL::text,
      pr.profile_url, NULL::text, false, pr.inferred_location, NULL::uuid
      FROM public.professional_prospecting_profiles pr
      WHERE pr.workspace_id = p_workspace_id AND (p_profile_id IS NULL OR pr.id <> p_profile_id)
  ), matched AS (
    SELECT e.entity_type, e.id, e.name, e.is_blocked,
      CASE
        WHEN c.place_key IS NOT NULL AND c.place_key = e.google_place_id THEN 'google_place_id'
        WHEN c.email_key IS NOT NULL AND c.email_key IN (public.prospecting_identity_key(e.email,'email'), public.prospecting_identity_key(e.alt_email,'email')) THEN 'email'
        WHEN c.phone_key IS NOT NULL AND c.phone_key IN (public.prospecting_identity_key(e.phone,'phone'), public.prospecting_identity_key(e.alt_phone,'phone')) THEN 'phone'
        WHEN c.profile_key IS NOT NULL AND c.profile_key = public.prospecting_identity_key(e.instagram_url,'profile') THEN 'profile'
        WHEN c.url_key IS NOT NULL AND c.url_key IN (public.prospecting_identity_key(e.website,'url'), public.prospecting_identity_key(e.alt_domain,'url')) THEN 'url'
        WHEN c.domain_key IS NOT NULL AND c.domain_key IN (public.prospecting_identity_key(e.website,'domain'), public.prospecting_identity_key(e.alt_domain,'domain')) THEN 'domain'
        WHEN c.name_key IS NOT NULL AND c.name_key = public.prospecting_identity_key(e.name,'name') THEN 'name'
      END AS field
    FROM entities e CROSS JOIN candidate c
    WHERE NOT (e.entity_type = 'lead' AND p_profile_id IS NOT NULL AND e.prospecting_profile_id = p_profile_id)
  ), relevant AS (
    SELECT m.*, o.id AS opportunity_id,
      (m.is_blocked OR EXISTS (
        SELECT 1 FROM public.outreach_suppressions s
        WHERE s.workspace_id = p_workspace_id AND s.entity_type = m.entity_type
          AND s.entity_id = m.id
      )) AS blocked
    FROM matched m
    LEFT JOIN LATERAL (
      SELECT op.id FROM public.opportunities op
      WHERE op.workspace_id = p_workspace_id AND op.status = 'open'
        AND ((m.entity_type = 'lead' AND op.lead_id = m.id)
          OR (m.entity_type = 'contact' AND op.contact_id = m.id)
          OR (m.entity_type = 'company' AND op.company_id = m.id))
      LIMIT 1
    ) o ON true
    WHERE m.field IS NOT NULL
  ), limited AS (
    SELECT * FROM relevant ORDER BY CASE WHEN blocked THEN 0
      WHEN opportunity_id IS NOT NULL THEN 1 WHEN field = 'name' THEN 3 ELSE 2 END,
      entity_type LIMIT 10
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entity_type',entity_type,'entity_id',id,'name',name,'field',field,
    'strength',CASE WHEN field = 'name' THEN 'possible' ELSE 'strong' END,
    'blocked',blocked,'opportunity_id',opportunity_id
  ) ORDER BY CASE WHEN blocked THEN 0 WHEN opportunity_id IS NOT NULL THEN 1
    WHEN field = 'name' THEN 3 ELSE 2 END, entity_type), '[]'::jsonb)
  INTO v_matches FROM limited;

  SELECT CASE
    -- A blocked record or open opportunity is never bypassed by confirming a name-only match.
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_matches) x WHERE (x->>'blocked')::boolean) THEN 'blocked'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_matches) x WHERE x->>'opportunity_id' IS NOT NULL) THEN 'opportunity'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_matches) x WHERE x->>'strength' = 'strong') THEN 'exists'
    WHEN jsonb_array_length(v_matches) > 0 THEN 'review'
    WHEN NOT v_has_strong_identifier THEN 'review'
    ELSE 'new' END INTO v_status;
  RETURN jsonb_build_object(
    'status',v_status,'matches',v_matches,
    'reason',CASE WHEN v_status = 'review' AND jsonb_array_length(v_matches) = 0
      AND NOT v_has_strong_identifier THEN 'missing_identifier' ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prospecting_import_lead_safe(
  p_workspace_id uuid, p_candidate jsonb, p_lead jsonb,
  p_profile_id uuid DEFAULT NULL, p_allow_possible boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_check jsonb; v_status text; v_lead_id uuid; v_profile record; v_source text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso ao espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF p_lead IS NULL OR jsonb_typeof(p_lead) <> 'object'
     OR length(btrim(coalesce(p_lead->>'name',''))) < 2 THEN
    RAISE EXCEPTION 'Nome do lead inválido';
  END IF;
  v_source := p_lead->>'source';
  IF v_source NOT IN ('web_search','google_local','professional_prospecting','instagram_extractor') THEN
    RAISE EXCEPTION 'Origem de prospeção inválida';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text, 94731));
  IF p_profile_id IS NOT NULL THEN
    SELECT id, converted_lead_id INTO v_profile
      FROM public.professional_prospecting_profiles
      WHERE id = p_profile_id AND workspace_id = p_workspace_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado neste espaço'; END IF;
    IF v_profile.converted_lead_id IS NOT NULL THEN
      RETURN jsonb_build_object('status','exists','lead_id',v_profile.converted_lead_id,
        'matches',jsonb_build_array(jsonb_build_object('entity_type','lead','entity_id',v_profile.converted_lead_id,'field','profile')));
    END IF;
  END IF;
  -- Never trust a caller-provided identity that differs from the row being created.
  v_check := public.prospecting_identity_check(p_workspace_id,p_lead,p_profile_id);
  v_status := v_check->>'status';
  IF v_status <> 'new' AND NOT (v_status = 'review' AND p_allow_possible) THEN
    RETURN v_check;
  END IF;

  INSERT INTO public.leads (
    workspace_id, created_by, name, email, phone, website, instagram_url,
    google_place_id, prospecting_profile_id, source, status, lead_type,
    address, city, about, industry, avatar_url, notes, ai_insight, tags,
    inferred_type, inferred_profession, inferred_specialty, inferred_workplace,
    business_category, confidence_score, lead_score, lead_score_explanation,
    lead_score_factors, instagram_followers_count, instagram_following_count,
    instagram_posts_count, instagram_bio, instagram_external_url,
    instagram_category, instagram_is_verified, instagram_is_business,
    instagram_enriched_at, assigned_to
  ) VALUES (
    p_workspace_id, auth.uid(), btrim(p_lead->>'name'),
    nullif(btrim(p_lead->>'email'),''), nullif(btrim(p_lead->>'phone'),''),
    nullif(btrim(p_lead->>'website'),''), nullif(btrim(p_lead->>'instagram_url'),''),
    nullif(btrim(p_lead->>'google_place_id'),''), p_profile_id, v_source,
    CASE WHEN p_lead->>'status' IN ('new','in_progress','completed') THEN p_lead->>'status' ELSE 'new' END,
    CASE WHEN p_lead->>'lead_type' IN ('person','company') THEN p_lead->>'lead_type' ELSE 'company' END,
    nullif(p_lead->>'address',''), nullif(p_lead->>'city',''), nullif(p_lead->>'about',''),
    nullif(p_lead->>'industry',''), nullif(p_lead->>'avatar_url',''),
    nullif(p_lead->>'notes',''), nullif(p_lead->>'ai_insight',''),
    CASE WHEN jsonb_typeof(p_lead->'tags') = 'array' THEN
      ARRAY(SELECT jsonb_array_elements_text(p_lead->'tags')) ELSE NULL END,
    nullif(p_lead->>'inferred_type',''), nullif(p_lead->>'inferred_profession',''),
    nullif(p_lead->>'inferred_specialty',''), nullif(p_lead->>'inferred_workplace',''),
    nullif(p_lead->>'business_category',''), nullif(p_lead->>'confidence_score','')::numeric,
    nullif(p_lead->>'lead_score','')::integer, nullif(p_lead->>'lead_score_explanation',''),
    p_lead->'lead_score_factors', nullif(p_lead->>'instagram_followers_count','')::integer,
    nullif(p_lead->>'instagram_following_count','')::integer,
    nullif(p_lead->>'instagram_posts_count','')::integer, nullif(p_lead->>'instagram_bio',''),
    nullif(p_lead->>'instagram_external_url',''), nullif(p_lead->>'instagram_category',''),
    nullif(p_lead->>'instagram_is_verified','')::boolean,
    nullif(p_lead->>'instagram_is_business','')::boolean,
    nullif(p_lead->>'instagram_enriched_at','')::timestamptz,
    auth.uid()
  ) RETURNING id INTO v_lead_id;

  IF p_profile_id IS NOT NULL THEN
    UPDATE public.professional_prospecting_profiles
      SET status = 'converted', converted_lead_id = v_lead_id,
          converted_at = now(), converted_by = auth.uid()
      WHERE id = p_profile_id AND workspace_id = p_workspace_id;
    UPDATE public.prospecting_outreach_queue SET status = 'cancelled'
      WHERE profile_id = p_profile_id AND status IN ('scheduled','ready');
  END IF;
  RETURN jsonb_build_object('status','created','lead_id',v_lead_id,'matches',v_check->'matches');
END;
$$;

REVOKE ALL ON FUNCTION public.prospecting_identity_key(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospecting_identity_check(uuid,jsonb,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prospecting_identity_check(uuid,jsonb,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) TO authenticated;
