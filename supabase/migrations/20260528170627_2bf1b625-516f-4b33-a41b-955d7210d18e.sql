-- Recompute saft_imports.stats->summary for completed imports using full DB aggregation
-- (the previous edge function summary was truncated at 1000 rows by PostgREST default).
WITH agg AS (
  SELECT
    import_id,
    jsonb_object_agg(entity_type, action_counts) AS summary
  FROM (
    SELECT
      import_id,
      entity_type,
      jsonb_object_agg(action, cnt) AS action_counts
    FROM (
      SELECT import_id, entity_type, action, COUNT(*)::int AS cnt
      FROM public.saft_import_items
      GROUP BY import_id, entity_type, action
    ) per_action
    GROUP BY import_id, entity_type
  ) per_entity
  GROUP BY import_id
)
UPDATE public.saft_imports si
SET stats = COALESCE(si.stats, '{}'::jsonb) || jsonb_build_object('summary', agg.summary)
FROM agg
WHERE si.id = agg.import_id
  AND si.status = 'completed';