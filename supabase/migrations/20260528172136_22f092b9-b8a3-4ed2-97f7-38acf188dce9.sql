
-- Recompute summary for all completed imports, adding "skipped" payment counts
-- so processed totals match expected (handles legacy imports where payments
-- referencing cancelled/missing invoices were silently dropped without a log row).
UPDATE public.saft_imports si
SET stats = COALESCE(si.stats, '{}'::jsonb) || jsonb_build_object(
  'summary',
  COALESCE(si.stats->'summary', '{}'::jsonb) || jsonb_build_object(
    'payment',
    COALESCE(si.stats->'summary'->'payment', '{}'::jsonb) || jsonb_build_object(
      'skipped',
      GREATEST(
        COALESCE((si.stats->>'payments')::int, 0)
          - COALESCE((si.stats->'summary'->'payment'->>'created')::int, 0)
          - COALESCE((si.stats->'summary'->'payment'->>'skipped_duplicate')::int, 0)
          - COALESCE((si.stats->'summary'->'payment'->>'failed')::int, 0)
          - COALESCE((si.stats->'summary'->'payment'->>'skipped')::int, 0),
        0
      )
    )
  )
)
WHERE status = 'completed'
  AND stats ? 'summary'
  AND COALESCE((stats->>'payments')::int, 0) >
      COALESCE((stats->'summary'->'payment'->>'created')::int, 0)
      + COALESCE((stats->'summary'->'payment'->>'skipped_duplicate')::int, 0)
      + COALESCE((stats->'summary'->'payment'->>'failed')::int, 0)
      + COALESCE((stats->'summary'->'payment'->>'skipped')::int, 0);
