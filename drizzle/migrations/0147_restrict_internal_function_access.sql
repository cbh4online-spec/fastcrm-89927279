REVOKE ALL ON FUNCTION public.refund_funnel_credits(uuid, uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_funnel_credits(uuid, uuid, text, text, text, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.get_workspace_stripe_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_stripe_config(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.retrieve_entity_memories(
  p_workspace_id uuid,
  p_entity_id uuid,
  p_entity_type text,
  p_query_embedding vector DEFAULT NULL::vector,
  p_max_results integer DEFAULT 10,
  p_min_relevance numeric DEFAULT 0.3,
  p_include_strategic boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  memory_type text,
  memory_category text,
  content text,
  relevance_score numeric,
  semantic_score numeric,
  combined_score numeric,
  is_validated boolean,
  version integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NOT (
      public.is_workspace_member(auth.uid(), p_workspace_id)
      OR public.is_super_admin(auth.uid())
    ) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;
  ELSIF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.memory_type,
    m.memory_category,
    m.content,
    COALESCE(m.relevance_score, 0.5)::numeric AS relevance_score,
    CASE
      WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL
      THEN (1 - (m.embedding <=> p_query_embedding))::numeric
      ELSE 0.5::numeric
    END AS semantic_score,
    (
      COALESCE(m.relevance_score, 0.5) * 0.4 +
      CASE
        WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL
        THEN (1 - (m.embedding <=> p_query_embedding)) * 0.4
        ELSE 0.2
      END +
      GREATEST(0, (1.0 - EXTRACT(EPOCH FROM (now() - m.created_at)) / (90.0 * 24 * 60 * 60))) * 0.2
    )::numeric AS combined_score,
    m.is_validated,
    m.version,
    m.created_at
  FROM public.ai_agent_memory m
  WHERE
    m.workspace_id = p_workspace_id
    AND m.entity_id = p_entity_id
    AND m.entity_type = p_entity_type
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND m.superseded_by IS NULL
    AND COALESCE(m.relevance_score, 0.5) >= p_min_relevance
  ORDER BY combined_score DESC
  LIMIT p_max_results;
END;
$function$;

REVOKE ALL ON FUNCTION public.retrieve_entity_memories(uuid, uuid, text, vector, integer, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retrieve_entity_memories(uuid, uuid, text, vector, integer, numeric, boolean) TO authenticated, service_role;