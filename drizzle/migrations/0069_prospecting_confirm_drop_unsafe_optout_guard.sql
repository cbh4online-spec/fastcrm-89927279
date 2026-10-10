-- Correção de 0068: outreach_suppressions não admite entity_type='profile' e a RPC não recebe canal,
-- por isso o guard de opt-out WhatsApp (que bloqueava também Instagram DM) é removido e fica como trabalho separado.
CREATE OR REPLACE FUNCTION public.prospecting_confirm_outreach(p_workspace_id uuid, p_profile_id uuid, p_step_index integer, p_sent_message text, p_media_url text DEFAULT NULL::text, p_queue_id uuid DEFAULT NULL::uuid, p_allow_review boolean DEFAULT false, p_message text DEFAULT NULL::text, p_message_plain text DEFAULT NULL::text, p_tone text DEFAULT NULL::text, p_schedule_followups boolean DEFAULT false, p_followup_messages jsonb DEFAULT '[]'::jsonb, p_renumber_legacy boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_candidate jsonb;
  v_check jsonb;
  v_status text;
  v_row_id uuid;
  v_fu record;
  v_fu_msg jsonb;
  v_old_first uuid;
  v_old_second uuid;
  v_lead record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem sessão' USING ERRCODE = '42501'; END IF;
  IF p_workspace_id IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso a este espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF p_step_index IS NULL OR p_step_index < 1 OR p_step_index > 3 THEN RAISE EXCEPTION 'Passo inválido'; END IF;
  IF p_sent_message IS NULL OR length(btrim(p_sent_message)) = 0 OR length(p_sent_message) > 8000 THEN
    RAISE EXCEPTION 'Mensagem inválida';
  END IF;
  IF p_media_url IS NOT NULL AND (length(p_media_url) > 2048 OR p_media_url !~* '^https://[^/\s]+'
      OR position(p_media_url IN p_sent_message) = 0) THEN
    RAISE EXCEPTION 'Ligação inválida';
  END IF;
  IF jsonb_typeof(coalesce(p_followup_messages, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Follow-ups inválidos'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text, 94731));

  SELECT id, workspace_id, status, converted_lead_id, profile_name, profile_url, platform,
         extracted_email, extracted_phone, instagram_external_url
    INTO v_profile
    FROM public.professional_prospecting_profiles
   WHERE id = p_profile_id AND workspace_id = p_workspace_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text || ':' || p_step_index::text, 0));

  IF v_profile.status = 'rejected' THEN
    RETURN jsonb_build_object('status', 'stopped', 'recorded', false);
  END IF;

  v_candidate := jsonb_build_object(
    'name', coalesce(v_profile.profile_name, ''),
    'email', v_profile.extracted_email,
    'phone', v_profile.extracted_phone,
    'website', v_profile.instagram_external_url,
    'profile_url', v_profile.profile_url,
    'instagram_url', CASE WHEN v_profile.platform = 'instagram' THEN v_profile.profile_url END
  );

  IF EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
              WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                AND step_index = p_step_index AND status IN ('cancelled', 'rejected', 'failed')) THEN
    RETURN jsonb_build_object('status', 'stopped', 'recorded', false);
  END IF;

  IF v_profile.converted_lead_id IS NOT NULL THEN
    IF p_step_index = 1 THEN
      v_check := public.prospecting_identity_check(p_workspace_id, v_candidate, NULL);
      v_status := coalesce(v_check->>'status', 'unavailable');
      RETURN jsonb_build_object(
        'status', CASE WHEN v_status IN ('blocked', 'opportunity', 'unavailable') THEN v_status ELSE 'exists' END,
        'matches', coalesce(v_check->'matches', '[]'::jsonb), 'recorded', false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                    WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                      AND step_index = p_step_index - 1 AND status = 'sent')
       OR NOT EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                       WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                         AND step_index = p_step_index AND status IN ('scheduled', 'ready', 'pending')
                         AND (p_queue_id IS NULL OR id = p_queue_id)) THEN
      RETURN jsonb_build_object('status', 'exists', 'reason', 'no_active_cadence', 'recorded', false);
    END IF;
    -- Lead ligado tem de ser o lead real deste perfil, ativo, do mesmo workspace (legados com NULL falham fechado).
    SELECT l.id, l.workspace_id, l.is_blocked, l.phone, l.prospecting_profile_id, l.archived_at,
           lower(coalesce(l.status, '')) AS status
      INTO v_lead FROM public.leads l
     WHERE l.id = v_profile.converted_lead_id AND l.workspace_id = p_workspace_id;
    IF NOT FOUND OR v_lead.prospecting_profile_id IS DISTINCT FROM p_profile_id OR v_lead.archived_at IS NOT NULL THEN
      RETURN jsonb_build_object('status', 'unavailable', 'reason', 'linked_lead_invalid', 'recorded', false);
    END IF;
    IF coalesce(v_lead.is_blocked, false)
       OR v_lead.status IN ('do_not_contact', 'unsubscribed', 'opt_out', 'opted_out', 'blocked', 'lost', 'disqualified', 'rejected')
       OR EXISTS (SELECT 1 FROM public.outreach_suppressions s
                   WHERE s.workspace_id = p_workspace_id
                     AND s.entity_type = 'lead' AND s.entity_id = v_lead.id) THEN
      RETURN jsonb_build_object('status', 'blocked', 'reason', 'linked_lead_blocked', 'recorded', false);
    END IF;
    IF EXISTS (SELECT 1 FROM public.opportunities op
                WHERE op.workspace_id = p_workspace_id AND op.status = 'open' AND op.lead_id = v_lead.id) THEN
      RETURN jsonb_build_object('status', 'opportunity', 'reason', 'linked_lead_opportunity', 'recorded', false);
    END IF;
    v_check := public.prospecting_identity_check(p_workspace_id, v_candidate, p_profile_id);
    v_status := coalesce(v_check->>'status', 'unavailable');
    IF v_status IN ('blocked', 'opportunity', 'unavailable', 'exists')
       OR (v_status = 'review' AND NOT coalesce(p_allow_review, false)) THEN
      RETURN jsonb_build_object('status', v_status, 'matches', coalesce(v_check->'matches', '[]'::jsonb), 'recorded', false);
    END IF;
    v_status := 'linked_followup';
  ELSE
    v_check := public.prospecting_identity_check(p_workspace_id, v_candidate, p_profile_id);
    v_status := coalesce(v_check->>'status', 'unavailable');
    IF v_status NOT IN ('new', 'review') OR (v_status = 'review' AND NOT coalesce(p_allow_review, false)) THEN
      RETURN jsonb_build_object('status', v_status, 'matches', coalesce(v_check->'matches', '[]'::jsonb), 'recorded', false);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
              WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                AND step_index = p_step_index AND status = 'sent') THEN
    RETURN jsonb_build_object('status', 'already_sent', 'recorded', false);
  END IF;

  IF p_renumber_legacy AND p_step_index = 1 AND p_queue_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                      WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = 3)
     AND NOT EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                      WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = 2
                        AND status NOT IN ('scheduled', 'ready', 'pending')) THEN
    SELECT id INTO v_old_first FROM public.prospecting_outreach_queue
     WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = 1
       AND status IN ('scheduled', 'ready', 'pending')
     ORDER BY created_at DESC LIMIT 1;
    IF v_old_first IS NOT NULL THEN
      SELECT id INTO v_old_second FROM public.prospecting_outreach_queue
       WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = 2
         AND status IN ('scheduled', 'ready', 'pending')
       ORDER BY created_at DESC LIMIT 1;
      IF v_old_second IS NOT NULL THEN
        UPDATE public.prospecting_outreach_queue SET step_index = 3, updated_at = now()
         WHERE id = v_old_second AND status IN ('scheduled', 'ready', 'pending');
      END IF;
      UPDATE public.prospecting_outreach_queue SET step_index = 2, updated_at = now()
       WHERE id = v_old_first AND status IN ('scheduled', 'ready', 'pending');
    END IF;
  END IF;

  IF p_queue_id IS NOT NULL THEN
    UPDATE public.prospecting_outreach_queue
       SET status = 'sent', sent_message = p_sent_message, sent_media_url = p_media_url, sent_at = now(),
           message = coalesce(p_message, message), message_plain = coalesce(p_message_plain, message_plain),
           updated_at = now()
     WHERE id = p_queue_id AND workspace_id = p_workspace_id AND profile_id = p_profile_id
       AND step_index = p_step_index AND status = 'ready'
    RETURNING id INTO v_row_id;
    IF v_row_id IS NULL THEN RAISE EXCEPTION 'Este follow-up já não está pronto para envio.'; END IF;
  ELSE
    SELECT id INTO v_row_id FROM public.prospecting_outreach_queue
     WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = p_step_index
       AND status IN ('scheduled', 'ready', 'pending')
     ORDER BY created_at DESC LIMIT 1;
    IF v_row_id IS NOT NULL THEN
      UPDATE public.prospecting_outreach_queue
         SET status = 'sent', sent_message = p_sent_message, sent_media_url = p_media_url, sent_at = now(),
             message = coalesce(p_message, message), message_plain = coalesce(p_message_plain, message_plain),
             tone = coalesce(p_tone, tone), updated_at = now()
       WHERE id = v_row_id;
    ELSE
      INSERT INTO public.prospecting_outreach_queue
        (workspace_id, profile_id, step_index, status, scheduled_for, message, message_plain, tone,
         sent_message, sent_media_url, sent_at)
      VALUES (p_workspace_id, p_profile_id, p_step_index, 'sent', now(), p_message, coalesce(p_message_plain, p_message),
              p_tone, p_sent_message, p_media_url, now())
      RETURNING id INTO v_row_id;
    END IF;
  END IF;

  IF p_step_index = 1 AND coalesce(p_schedule_followups, false) THEN
    FOR v_fu IN SELECT * FROM (VALUES (2, 3), (3, 7)) AS t(step_index, days) LOOP
      IF NOT EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                      WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                        AND step_index = v_fu.step_index) THEN
        SELECT e INTO v_fu_msg FROM jsonb_array_elements(coalesce(p_followup_messages, '[]'::jsonb)) e
         WHERE (e->>'step_index')::int = v_fu.step_index LIMIT 1;
        INSERT INTO public.prospecting_outreach_queue
          (workspace_id, profile_id, step_index, status, scheduled_for, message, message_plain, tone)
        VALUES (p_workspace_id, p_profile_id, v_fu.step_index, 'scheduled', now() + make_interval(days => v_fu.days),
                left(v_fu_msg->>'message', 8000), left(v_fu_msg->>'message_plain', 8000), p_tone);
      END IF;
      v_fu_msg := NULL;
    END LOOP;
  END IF;

  UPDATE public.professional_prospecting_profiles
     SET outreach_step = p_step_index
   WHERE id = p_profile_id AND workspace_id = p_workspace_id
     AND (outreach_step IS NULL OR outreach_step < p_step_index);

  RETURN jsonb_build_object('status', 'sent', 'recorded', true, 'queue_id', v_row_id,
                            'identity_status', v_status, 'step_index', p_step_index);
END;
$function$;
REVOKE ALL ON FUNCTION public.prospecting_confirm_outreach(uuid,uuid,integer,text,text,uuid,boolean,text,text,text,boolean,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospecting_confirm_outreach(uuid,uuid,integer,text,text,uuid,boolean,text,text,text,boolean,jsonb,boolean) TO authenticated, service_role;