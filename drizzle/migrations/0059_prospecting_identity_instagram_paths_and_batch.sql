CREATE OR REPLACE FUNCTION public.prospecting_identity_key(p_value text, p_kind text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v text; v_user text;
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
      v_user := substring(v from 2);
      RETURN CASE WHEN v_user ~ '^[a-z0-9._]{1,30}$' THEN 'instagram:' || v_user ELSE NULL END;
    END IF;
    v := regexp_replace(v, '^[a-z][a-z0-9+.-]*://', '');
    v := regexp_replace(v, '^www\.', '');
    v := split_part(split_part(v, '?', 1), '#', 1);
    v := regexp_replace(v, '/+$', '');
    IF v ~ '^(m\.)?instagram\.com(/|$)' THEN
      -- Only the first path segment can be a username. Content/system paths
      -- (/p/, /reel/, /stories/, ...) never identify the author.
      v_user := split_part(v, '/', 2);
      IF v_user = '' OR v_user !~ '^[a-z0-9._]{1,30}$' OR v_user IN (
        'p','reel','reels','tv','stories','explore','accounts','direct','about',
        'developer','legal','web','s','highlights','tags','locations','challenge',
        'privacy','terms','api','oauth','emails','session','topics','ar','lite'
      ) THEN
        RETURN NULL;
      END IF;
      RETURN 'instagram:' || v_user;
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
  IF v_source IS NULL OR v_source NOT IN ('web_search','google_local','professional_prospecting','instagram_extractor','instagram_looter') THEN
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

-- Batch read for result lists: one round-trip per page (max 100), same
-- workspace-scoped check as the single RPC.
CREATE OR REPLACE FUNCTION public.prospecting_identity_check_batch(
  p_workspace_id uuid, p_candidates jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_item jsonb; v_out jsonb := '[]'::jsonb; v_profile_id uuid;
  v_lead_id uuid; v_lead_name text; v_key text; v_res jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso ao espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF p_candidates IS NULL OR jsonb_typeof(p_candidates) <> 'array' THEN
    RAISE EXCEPTION 'Lista de candidatos inválida';
  END IF;
  IF jsonb_array_length(p_candidates) > 100 THEN
    RAISE EXCEPTION 'Máximo de 100 candidatos por pedido';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_candidates) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN CONTINUE; END IF;
    v_key := left(coalesce(v_item->>'key', ''), 100);
    v_profile_id := NULL; v_lead_id := NULL; v_lead_name := NULL;
    IF coalesce(v_item->>'profile_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT pr.id INTO v_profile_id FROM public.professional_prospecting_profiles pr
        WHERE pr.id = (v_item->>'profile_id')::uuid AND pr.workspace_id = p_workspace_id;
    END IF;
    IF v_profile_id IS NOT NULL THEN
      SELECT l.id, l.name INTO v_lead_id, v_lead_name
        FROM public.professional_prospecting_profiles pr
        JOIN public.leads l ON l.id = pr.converted_lead_id AND l.workspace_id = p_workspace_id
        WHERE pr.id = v_profile_id;
    END IF;
    IF v_lead_id IS NOT NULL THEN
      -- Converted profile: check without excluding it so blocks/opportunities on
      -- the created lead surface; drop the profile's self-match.
      v_res := public.prospecting_identity_check(p_workspace_id, v_item - 'key' - 'profile_id', NULL);
      v_res := jsonb_set(v_res, '{matches}', coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(v_res->'matches') x
        WHERE NOT (x->>'entity_type' = 'profile' AND x->>'entity_id' = v_profile_id::text)), '[]'::jsonb));
      IF jsonb_array_length(v_res->'matches') = 0 OR v_res->>'status' IN ('new','review') THEN
        v_res := jsonb_build_object('status', CASE WHEN v_res->>'status' IN ('blocked','opportunity') THEN v_res->>'status' ELSE 'exists' END,
          'matches', jsonb_build_array(jsonb_build_object(
          'entity_type','lead','entity_id',v_lead_id,'name',v_lead_name,'field','profile',
          'strength','strong','blocked',false,'opportunity_id',NULL)) || (v_res->'matches'));
      END IF;
    ELSE
      v_res := public.prospecting_identity_check(p_workspace_id, v_item - 'key' - 'profile_id', v_profile_id);
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object('key', v_key, 'result', v_res));
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.prospecting_identity_check_batch(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospecting_identity_key(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prospecting_identity_check_batch(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) TO authenticated;