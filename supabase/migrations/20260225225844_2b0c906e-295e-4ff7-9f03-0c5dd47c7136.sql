
CREATE OR REPLACE FUNCTION public.get_lifecycle_metrics(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH transitions AS (
    SELECT
      cal.contact_id,
      cal.old_value::text AS from_stage,
      cal.new_value::text AS to_stage,
      cal.changed_at,
      LAG(cal.changed_at) OVER (PARTITION BY cal.contact_id ORDER BY cal.changed_at) AS prev_changed_at
    FROM contact_audit_log cal
    WHERE cal.workspace_id = p_workspace_id
      AND cal.field_name = 'lifecycle_stage'
    ORDER BY cal.contact_id, cal.changed_at
  ),
  stage_durations AS (
    SELECT
      from_stage AS stage,
      EXTRACT(EPOCH FROM (changed_at - prev_changed_at)) / 86400.0 AS days_in_stage
    FROM transitions
    WHERE prev_changed_at IS NOT NULL
      AND from_stage IS NOT NULL
      AND from_stage != ''
  ),
  avg_days AS (
    SELECT
      stage,
      ROUND(AVG(days_in_stage)::numeric, 1) AS avg_days
    FROM stage_durations
    GROUP BY stage
  ),
  stage_counts AS (
    SELECT
      new_value::text AS stage,
      COUNT(DISTINCT contact_id) AS entered_count
    FROM contact_audit_log
    WHERE workspace_id = p_workspace_id
      AND field_name = 'lifecycle_stage'
    GROUP BY new_value::text
  ),
  conversion_pairs AS (
    SELECT
      from_stage,
      to_stage,
      COUNT(*) AS transition_count
    FROM transitions
    WHERE from_stage IS NOT NULL AND to_stage IS NOT NULL
    GROUP BY from_stage, to_stage
  ),
  conversion_rates AS (
    SELECT
      cp.from_stage,
      cp.to_stage,
      CASE WHEN sc.entered_count > 0
        THEN ROUND((cp.transition_count::numeric / sc.entered_count::numeric) * 100, 1)
        ELSE 0
      END AS rate
    FROM conversion_pairs cp
    LEFT JOIN stage_counts sc ON sc.stage = cp.from_stage
  )
  SELECT jsonb_build_object(
    'avg_days_per_stage', COALESCE(
      (SELECT jsonb_object_agg(stage, avg_days) FROM avg_days),
      '{}'::jsonb
    ),
    'conversion_rates', COALESCE(
      (SELECT jsonb_object_agg(from_stage || '_to_' || to_stage, rate) FROM conversion_rates),
      '{}'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;
