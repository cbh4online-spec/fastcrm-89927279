CREATE INDEX IF NOT EXISTS idx_leads_ident_place ON public.leads (workspace_id, google_place_id);
CREATE INDEX IF NOT EXISTS idx_leads_ident_email ON public.leads (workspace_id, public.prospecting_identity_key(email,'email'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_alt_email ON public.leads (workspace_id, public.prospecting_identity_key(coalesce(external_email,preferred_contact_email),'email'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_phone ON public.leads (workspace_id, public.prospecting_identity_key(phone,'phone'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_alt_phone ON public.leads (workspace_id, public.prospecting_identity_key(preferred_contact_phone,'phone'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_profile ON public.leads (workspace_id, public.prospecting_identity_key(instagram_url,'profile'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_url ON public.leads (workspace_id, public.prospecting_identity_key(website,'url'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_domain ON public.leads (workspace_id, public.prospecting_identity_key(website,'domain'));
CREATE INDEX IF NOT EXISTS idx_leads_ident_name ON public.leads (workspace_id, public.prospecting_identity_key(name,'name'));

CREATE OR REPLACE FUNCTION public.prospecting_identity_check(p_workspace_id uuid, p_candidate jsonb, p_profile_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_matches jsonb; v_status text; v_has_strong_identifier boolean;
  k_email text; k_phone text; k_url text; k_domain text; k_profile text; k_name text; k_place text;
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

  k_email := public.prospecting_identity_key(p_candidate->>'email','email');
  k_phone := public.prospecting_identity_key(p_candidate->>'phone','phone');
  k_url := public.prospecting_identity_key(p_candidate->>'website','url');
  k_domain := public.prospecting_identity_key(p_candidate->>'website','domain');
  k_profile := public.prospecting_identity_key(coalesce(p_candidate->>'instagram_url',p_candidate->>'profile_url',p_candidate->>'website'),'profile');
  k_name := public.prospecting_identity_key(p_candidate->>'name','name');
  k_place := nullif(btrim(p_candidate->>'google_place_id'),'');

  WITH candidate AS (
    SELECT k_email AS email_key, k_phone AS phone_key, k_url AS url_key, k_domain AS domain_key,
      k_profile AS profile_key, k_name AS name_key, k_place AS place_key
  ), entities AS (
    SELECT 'lead' AS entity_type, l.id, l.name, l.email, coalesce(l.external_email,l.preferred_contact_email) AS alt_email,
      l.phone, l.preferred_contact_phone AS alt_phone, l.website, NULL::text AS alt_domain,
      l.instagram_url, l.google_place_id, l.is_blocked, l.city, l.prospecting_profile_id
      FROM public.leads l WHERE l.workspace_id = p_workspace_id
        -- Index-backed prefilter: only leads sharing at least one key are evaluated.
        AND (l.google_place_id = k_place
          OR public.prospecting_identity_key(l.email,'email') = k_email
          OR public.prospecting_identity_key(coalesce(l.external_email,l.preferred_contact_email),'email') = k_email
          OR public.prospecting_identity_key(l.phone,'phone') = k_phone
          OR public.prospecting_identity_key(l.preferred_contact_phone,'phone') = k_phone
          OR public.prospecting_identity_key(l.instagram_url,'profile') = k_profile
          OR public.prospecting_identity_key(l.website,'url') = k_url
          OR public.prospecting_identity_key(l.website,'domain') = k_domain
          OR public.prospecting_identity_key(l.name,'name') = k_name)
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
$function$;