CREATE OR REPLACE FUNCTION public.ensi_ingest_meta_lead(
  p_workspace_id uuid, p_page_id text, p_form_id text, p_lead_id_external text,
  p_campaign_id text, p_adset_id text, p_ad_id text,
  p_raw_payload jsonb, p_normalized_payload jsonb, p_received_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE
  v_workspace uuid; v_owner uuid; v_full_name text; v_email text; v_phone text; v_phone_digits text;
  v_matches uuid[]; v_lead uuid; v_meta_lead uuid; v_disposition text; v_lock_key text;
  v_notes text; v_receipt public.ensi_meta_lead_receipts%ROWTYPE;
BEGIN
  IF p_workspace_id IS NULL OR p_page_id IS NULL OR p_form_id IS NULL OR p_lead_id_external IS NULL THEN
    RAISE EXCEPTION 'ENSI_MISSING_REQUIRED_ID'; END IF;
  IF p_workspace_id <> '0662fc16-6286-4156-a908-08c7dfec0fb7'::uuid OR p_page_id <> '113692350807474'
     OR p_form_id <> '29967420322844561' OR p_lead_id_external !~ '^[0-9]{1,64}$' THEN
    RAISE EXCEPTION 'ENSI_INVALID_TARGET'; END IF;
  IF jsonb_typeof(p_raw_payload) IS DISTINCT FROM 'object' OR jsonb_typeof(p_normalized_payload) IS DISTINCT FROM 'object'
     OR length(p_raw_payload::text) > 100000 OR length(p_normalized_payload::text) > 20000 THEN
    RAISE EXCEPTION 'ENSI_INVALID_PAYLOAD'; END IF;
  IF (p_campaign_id IS NOT NULL AND p_campaign_id !~ '^[0-9]{1,64}$') OR (p_adset_id IS NOT NULL AND p_adset_id !~ '^[0-9]{1,64}$')
     OR (p_ad_id IS NOT NULL AND p_ad_id !~ '^[0-9]{1,64}$') THEN
    RAISE EXCEPTION 'ENSI_INVALID_ATTRIBUTION'; END IF;

  SELECT w.id INTO v_workspace FROM public.workspaces w WHERE w.id = p_workspace_id AND w.slug = 'pharliss';
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'ENSI_INVALID_WORKSPACE'; END IF;

  v_full_name := nullif(left(btrim(coalesce(p_normalized_payload->>'full_name', '')), 200), '');
  v_email := nullif(lower(left(btrim(coalesce(p_normalized_payload->>'email', '')), 320)), '');
  v_phone := nullif(left(btrim(coalesce(p_normalized_payload->>'phone_number', '')), 40), '');
  v_phone_digits := nullif(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), '');
  IF v_email IS NOT NULL AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN v_email := NULL; END IF;
  IF v_phone_digits IS NOT NULL AND (length(v_phone_digits) < 7 OR length(v_phone_digits) > 15) THEN
    v_phone := NULL; v_phone_digits := NULL; END IF;
  IF v_email IS NULL AND v_phone_digits IS NULL THEN RAISE EXCEPTION 'ENSI_NO_CONTACT_DATA'; END IF;

  SELECT wm.user_id INTO v_owner FROM public.workspace_members wm
  WHERE wm.workspace_id = v_workspace AND wm.role = 'owner' ORDER BY wm.created_at, wm.user_id LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'ENSI_WORKSPACE_OWNER_MISSING'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ensi-meta-lead:' || p_lead_id_external, 0));
  SELECT * INTO v_receipt FROM public.ensi_meta_lead_receipts WHERE lead_id_external = p_lead_id_external;
  IF FOUND THEN
    IF v_receipt.workspace_id <> v_workspace OR v_receipt.page_id <> p_page_id OR v_receipt.form_id <> p_form_id THEN
      RAISE EXCEPTION 'ENSI_IDEMPOTENCY_CONFLICT'; END IF;
    RETURN jsonb_build_object('status','duplicate','meta_lead_id',v_receipt.meta_lead_id,'lead_id',v_receipt.lead_id,'contact_disposition',v_receipt.contact_disposition);
  END IF;

  FOR v_lock_key IN SELECT DISTINCT k FROM (VALUES
      (CASE WHEN v_email IS NOT NULL THEN 'email:' || v_email END),
      (CASE WHEN v_phone_digits IS NOT NULL THEN 'phone:' || v_phone_digits END)) t(k)
    WHERE k IS NOT NULL ORDER BY k
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('ensi-lead:' || v_workspace::text || ':' || v_lock_key, 0));
  END LOOP;

  v_notes := public.ensi_form_answers_text(p_raw_payload)
    || E'\n\nFormulário: ENSI | Iniciação Porto e Lisboa | Janeiro 2027 | Nov 2026'
    || E'\nID Meta: ' || p_lead_id_external
    || coalesce(E'\nCampanha: ' || p_campaign_id, '') || coalesce(E'\nConjunto: ' || p_adset_id, '') || coalesce(E'\nAnúncio: ' || p_ad_id, '');

  SELECT array_agg(l.id ORDER BY l.archived_at NULLS FIRST, l.created_at) INTO v_matches FROM public.leads l
  WHERE l.workspace_id = v_workspace AND (
    (v_email IS NOT NULL AND lower(btrim(coalesce(l.email,''))) = v_email)
    OR (v_phone_digits IS NOT NULL AND regexp_replace(coalesce(l.phone,''), '\D', '', 'g') = v_phone_digits));

  IF coalesce(cardinality(v_matches),0) >= 1 THEN
    v_lead := v_matches[1]; v_disposition := CASE WHEN cardinality(v_matches) > 1 THEN 'ambiguous' ELSE 'reused' END;
    UPDATE public.leads SET notes = concat_ws(E'\n\n---\n', nullif(notes,''), v_notes), updated_at = now() WHERE id = v_lead;
  ELSE
    INSERT INTO public.leads (workspace_id, created_by, name, email, phone, source, status, tags, notes, lead_type)
    VALUES (v_workspace, v_owner, coalesce(v_full_name, v_email, v_phone), v_email, v_phone,
      'meta_lead_ads', 'new', ARRAY['Meta Lead Ads','ENSI'], v_notes, 'person')
    RETURNING id INTO v_lead;
    v_disposition := 'created';
  END IF;

  INSERT INTO public.meta_leads (workspace_id, page_id, form_id, lead_id_external, campaign_id, adset_id, ad_id, platform,
    raw_payload_json, normalized_payload_json, dedupe_key, processing_status, lead_id, error_message, received_at, processed_at)
  VALUES (v_workspace, p_page_id, p_form_id, p_lead_id_external, p_campaign_id, p_adset_id, p_ad_id, 'facebook',
    p_raw_payload, p_normalized_payload, nullif(concat_ws('|', v_email, v_phone_digits), ''), 'processed', v_lead,
    CASE WHEN v_disposition = 'ambiguous' THEN 'ambiguous_lead_match' END, coalesce(p_received_at, now()), now())
  RETURNING id INTO v_meta_lead;

  INSERT INTO public.ensi_meta_lead_receipts (lead_id_external, workspace_id, page_id, form_id, meta_lead_id, lead_id, contact_disposition)
  VALUES (p_lead_id_external, v_workspace, p_page_id, p_form_id, v_meta_lead, v_lead, v_disposition);

  RETURN jsonb_build_object('status','accepted','meta_lead_id',v_meta_lead,'lead_id',v_lead,'contact_disposition',v_disposition);
END;
$$;
REVOKE ALL ON FUNCTION public.ensi_ingest_meta_lead(uuid, text, text, text, text, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensi_ingest_meta_lead(uuid, text, text, text, text, text, text, jsonb, jsonb, timestamptz) TO service_role;