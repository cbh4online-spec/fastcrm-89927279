
-- WhatsApp Operations Dashboard RPC
-- Calcula KPIs: SLA primeira resposta, tempo médio, conversões por origem (lead.source)

CREATE OR REPLACE FUNCTION public.whatsapp_ops_dashboard(
  p_workspace_id uuid,
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now(),
  p_sla_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_conv integer := 0;
  v_first_responses jsonb;
  v_overall jsonb;
  v_by_source jsonb;
  v_by_day jsonb;
  v_by_agent jsonb;
BEGIN
  -- Verificar pertença ao workspace
  IF NOT is_workspace_member(auth.uid(), p_workspace_id)
     AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  -- CTE base: para cada conversa whatsapp criada na janela, calcular
  -- a primeira mensagem inbound e a primeira resposta outbound após essa.
  WITH conv AS (
    SELECT c.id, c.workspace_id, c.created_at, c.lead_id, c.assigned_to, c.status,
           c.ai_intent, c.last_message_at
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.channel = 'whatsapp'
      AND c.created_at >= p_from
      AND c.created_at < p_to
  ),
  first_in AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_inbound_at
    FROM messages m
    JOIN conv ON conv.id = m.conversation_id
    WHERE m.direction = 'inbound'
    GROUP BY m.conversation_id
  ),
  first_out AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_outbound_at
    FROM messages m
    JOIN first_in fi ON fi.conversation_id = m.conversation_id
    WHERE m.direction = 'outbound' AND m.sent_at >= fi.first_inbound_at
    GROUP BY m.conversation_id
  ),
  response_times AS (
    SELECT
      conv.id AS conversation_id,
      conv.lead_id,
      conv.assigned_to,
      conv.status,
      fi.first_inbound_at,
      fo.first_outbound_at,
      CASE WHEN fo.first_outbound_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at)) / 60.0
      END AS first_response_minutes
    FROM conv
    LEFT JOIN first_in fi ON fi.conversation_id = conv.id
    LEFT JOIN first_out fo ON fo.conversation_id = conv.id
  )
  SELECT
    count(*),
    jsonb_build_object(
      'total_conversations', count(*),
      'responded', count(*) FILTER (WHERE first_outbound_at IS NOT NULL),
      'pending_response', count(*) FILTER (WHERE first_inbound_at IS NOT NULL AND first_outbound_at IS NULL),
      'avg_first_response_minutes',
        round(avg(first_response_minutes)::numeric, 2),
      'median_first_response_minutes',
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY first_response_minutes)::numeric, 2),
      'p90_first_response_minutes',
        round(percentile_cont(0.9) WITHIN GROUP (ORDER BY first_response_minutes)::numeric, 2),
      'within_sla', count(*) FILTER (WHERE first_response_minutes <= p_sla_minutes),
      'sla_breached', count(*) FILTER (WHERE first_response_minutes > p_sla_minutes
                                       OR (first_inbound_at IS NOT NULL AND first_outbound_at IS NULL)),
      'sla_compliance_pct',
        CASE WHEN count(*) FILTER (WHERE first_inbound_at IS NOT NULL) > 0
             THEN round(
               100.0 * count(*) FILTER (WHERE first_response_minutes <= p_sla_minutes)
               / count(*) FILTER (WHERE first_inbound_at IS NOT NULL),
               2)
             ELSE NULL END,
      'sla_minutes', p_sla_minutes
    )
  INTO v_total_conv, v_overall
  FROM response_times;

  -- Por origem (lead.source) — conversões = leads associados que viraram client/won
  WITH conv AS (
    SELECT c.id, c.lead_id
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.channel = 'whatsapp'
      AND c.created_at >= p_from
      AND c.created_at < p_to
  ),
  src AS (
    SELECT
      COALESCE(NULLIF(l.source, ''), 'desconhecido') AS source,
      conv.id AS conversation_id,
      l.status AS lead_status,
      l.estimated_value
    FROM conv
    LEFT JOIN leads l ON l.id = conv.lead_id
  )
  SELECT jsonb_agg(row_to_json(t)) INTO v_by_source FROM (
    SELECT
      source,
      count(*) AS conversations,
      count(*) FILTER (WHERE lead_status IN ('client', 'won', 'converted')) AS conversions,
      CASE WHEN count(*) > 0
           THEN round(100.0 * count(*) FILTER (WHERE lead_status IN ('client','won','converted')) / count(*), 2)
           ELSE 0 END AS conversion_rate_pct,
      round(coalesce(sum(estimated_value) FILTER (WHERE lead_status IN ('client','won','converted')), 0)::numeric, 2) AS converted_value
    FROM src
    GROUP BY source
    ORDER BY conversations DESC
  ) t;

  -- Série temporal por dia
  WITH conv AS (
    SELECT c.id, c.created_at
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.channel = 'whatsapp'
      AND c.created_at >= p_from
      AND c.created_at < p_to
  ),
  first_in AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_inbound_at
    FROM messages m JOIN conv ON conv.id = m.conversation_id
    WHERE m.direction = 'inbound' GROUP BY m.conversation_id
  ),
  first_out AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_outbound_at
    FROM messages m JOIN first_in fi ON fi.conversation_id = m.conversation_id
    WHERE m.direction = 'outbound' AND m.sent_at >= fi.first_inbound_at
    GROUP BY m.conversation_id
  )
  SELECT jsonb_agg(row_to_json(t) ORDER BY day) INTO v_by_day FROM (
    SELECT
      date_trunc('day', conv.created_at)::date AS day,
      count(*) AS conversations,
      round(avg(EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at))/60.0)::numeric, 2) AS avg_first_response_minutes,
      count(*) FILTER (WHERE EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at))/60.0 <= p_sla_minutes) AS within_sla
    FROM conv
    LEFT JOIN first_in fi ON fi.conversation_id = conv.id
    LEFT JOIN first_out fo ON fo.conversation_id = conv.id
    GROUP BY 1
  ) t;

  -- Por agente
  WITH conv AS (
    SELECT c.id, c.assigned_to, c.created_at, c.lead_id
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.channel = 'whatsapp'
      AND c.created_at >= p_from
      AND c.created_at < p_to
      AND c.assigned_to IS NOT NULL
  ),
  first_in AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_inbound_at
    FROM messages m JOIN conv ON conv.id = m.conversation_id
    WHERE m.direction = 'inbound' GROUP BY m.conversation_id
  ),
  first_out AS (
    SELECT m.conversation_id, MIN(m.sent_at) AS first_outbound_at
    FROM messages m JOIN first_in fi ON fi.conversation_id = m.conversation_id
    WHERE m.direction = 'outbound' AND m.sent_at >= fi.first_inbound_at
    GROUP BY m.conversation_id
  )
  SELECT jsonb_agg(row_to_json(t) ORDER BY conversations DESC) INTO v_by_agent FROM (
    SELECT
      conv.assigned_to AS agent_id,
      coalesce(p.full_name, p.email, 'Agente') AS agent_name,
      count(*) AS conversations,
      round(avg(EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at))/60.0)::numeric, 2) AS avg_first_response_minutes,
      count(*) FILTER (WHERE EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at))/60.0 <= p_sla_minutes) AS within_sla,
      count(*) FILTER (WHERE l.status IN ('client','won','converted')) AS conversions
    FROM conv
    LEFT JOIN first_in fi ON fi.conversation_id = conv.id
    LEFT JOIN first_out fo ON fo.conversation_id = conv.id
    LEFT JOIN profiles p ON p.id = conv.assigned_to
    LEFT JOIN leads l ON l.id = conv.lead_id
    GROUP BY conv.assigned_to, p.full_name, p.email
  ) t;

  v_result := jsonb_build_object(
    'overall', coalesce(v_overall, '{}'::jsonb),
    'by_source', coalesce(v_by_source, '[]'::jsonb),
    'by_day', coalesce(v_by_day, '[]'::jsonb),
    'by_agent', coalesce(v_by_agent, '[]'::jsonb),
    'window', jsonb_build_object('from', p_from, 'to', p_to, 'sla_minutes', p_sla_minutes)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', 'internal_error',
    'message', SQLERRM,
    'overall', '{}'::jsonb,
    'by_source', '[]'::jsonb,
    'by_day', '[]'::jsonb,
    'by_agent', '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.whatsapp_ops_dashboard(uuid, timestamptz, timestamptz, integer) TO authenticated;
