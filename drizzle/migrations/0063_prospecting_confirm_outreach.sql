CREATE OR REPLACE FUNCTION public.prospecting_confirm_outreach(
  p_workspace_id uuid,
  p_profile_id uuid,
  p_step_index integer,
  p_sent_message text,
  p_media_url text DEFAULT NULL,
  p_queue_id uuid DEFAULT NULL,
  p_allow_review boolean DEFAULT false,
  p_message text DEFAULT NULL,
  p_message_plain text DEFAULT NULL,
  p_tone text DEFAULT NULL,
  p_schedule_followups boolean DEFAULT false,
  p_followup_messages jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile record;
  v_check jsonb;
  v_status text;
  v_row_id uuid;
  v_fu record;
  v_fu_msg jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem sessão' USING ERRCODE = '42501'; END IF;
  IF p_workspace_id IS NULL OR NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Sem acesso a este espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF p_step_index IS NULL OR p_step_index < 1 OR p_step_index > 10 THEN RAISE EXCEPTION 'Passo inválido'; END IF;
  IF p_sent_message IS NULL OR length(btrim(p_sent_message)) = 0 OR length(p_sent_message) > 8000 THEN
    RAISE EXCEPTION 'Mensagem inválida';
  END IF;
  IF p_media_url IS NOT NULL AND (length(p_media_url) > 2048 OR p_media_url !~* '^https://[^/\s]+') THEN
    RAISE EXCEPTION 'Ligação inválida';
  END IF;
  IF jsonb_typeof(coalesce(p_followup_messages, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Follow-ups inválidos'; END IF;

  -- Lock the profile row, then serialise per profile+step.
  SELECT id, workspace_id, profile_name, profile_url, platform, extracted_email, extracted_phone,
         instagram_external_url, outreach_step
    INTO v_profile
    FROM public.professional_prospecting_profiles
   WHERE id = p_profile_id AND workspace_id = p_workspace_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text || ':' || p_step_index::text, 0));

  -- Fresh identity check inside the transaction (never a cached client result).
  v_check := public.prospecting_identity_check(
    p_workspace_id,
    jsonb_build_object(
      'name', coalesce(v_profile.profile_name, ''),
      'email', v_profile.extracted_email,
      'phone', v_profile.extracted_phone,
      'website', v_profile.instagram_external_url,
      'profile_url', v_profile.profile_url,
      'instagram_url', CASE WHEN v_profile.platform = 'instagram' THEN v_profile.profile_url END
    ),
    p_profile_id
  );
  v_status := coalesce(v_check->>'status', 'unavailable');
  IF v_status NOT IN ('new', 'review') OR (v_status = 'review' AND NOT coalesce(p_allow_review, false)) THEN
    RETURN jsonb_build_object('status', v_status, 'matches', coalesce(v_check->'matches', '[]'::jsonb), 'recorded', false);
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
    -- Duplicate queue groups exist: update only the most recent open row, never all.
    SELECT id INTO v_row_id FROM public.prospecting_outreach_queue
     WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id AND step_index = p_step_index
       AND status NOT IN ('sent', 'rejected')
     ORDER BY created_at DESC LIMIT 1;
    IF v_row_id IS NOT NULL THEN
      UPDATE public.prospecting_outreach_queue
         SET status = 'sent', sent_message = p_sent_message, sent_media_url = p_media_url, sent_at = now(),
             message = coalesce(p_message, message), message_plain = coalesce(p_message_plain, message_plain),
             tone = coalesce(p_tone, tone), updated_at = now()
       WHERE id = v_row_id;
    ELSIF EXISTS (SELECT 1 FROM public.prospecting_outreach_queue
                   WHERE workspace_id = p_workspace_id AND profile_id = p_profile_id
                     AND step_index = p_step_index AND status = 'sent') THEN
      RETURN jsonb_build_object('status', 'already_sent', 'recorded', false);
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
$$;
REVOKE ALL ON FUNCTION public.prospecting_confirm_outreach(uuid, uuid, integer, text, text, uuid, boolean, text, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospecting_confirm_outreach(uuid, uuid, integer, text, text, uuid, boolean, text, text, text, boolean, jsonb) TO authenticated;
COMMENT ON FUNCTION public.prospecting_mark_outreach_sent(uuid, text, text) IS 'DEPRECATED: replaced by prospecting_confirm_outreach (identity recheck + lock).';