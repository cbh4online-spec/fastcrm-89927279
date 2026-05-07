
CREATE OR REPLACE FUNCTION public.emit_voice_workflow_event(
  p_workspace_id uuid,
  p_event_type text,
  p_call_log_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def record;
  v_full_payload jsonb;
BEGIN
  v_full_payload := jsonb_build_object('call_log_id', p_call_log_id, 'event_type', p_event_type) || COALESCE(p_payload, '{}'::jsonb);

  FOR v_def IN
    SELECT id, code, version
      FROM public.workflow_definitions
     WHERE workspace_id = p_workspace_id
       AND trigger_type = p_event_type
       AND COALESCE(is_active, true) = true
  LOOP
    INSERT INTO public.workflow_executions (
      workspace_id, definition_id, workflow_code, workflow_version,
      trigger_type, trigger_source, entity_type, entity_id,
      input_data, status, scheduled_for
    ) VALUES (
      p_workspace_id, v_def.id, v_def.code, v_def.version,
      p_event_type, 'voice_intelligence', 'voice_call_log', p_call_log_id,
      v_full_payload, 'pending', now()
    );
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'emit_voice_workflow_event failed: %', SQLERRM;
END;
$$;
