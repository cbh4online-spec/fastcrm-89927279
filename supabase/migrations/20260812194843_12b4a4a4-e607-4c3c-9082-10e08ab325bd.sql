CREATE OR REPLACE FUNCTION public.get_published_builder_asset(
  _hostname TEXT DEFAULT NULL,
  _path TEXT DEFAULT NULL,
  _slug TEXT DEFAULT NULL,
  _workspace UUID DEFAULT NULL
)
RETURNS TABLE (
  asset_id UUID,
  name TEXT,
  html TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH resolved AS (
    SELECT a.id, a.name, a.html AS fallback_html, a.updated_at
    FROM public.builder_assets a
    WHERE a.deleted_at IS NULL
      AND a.status = 'published'
      AND (
        (_slug IS NOT NULL AND _workspace IS NOT NULL
         AND a.slug = _slug AND a.workspace_id = _workspace)
        OR (_slug IS NOT NULL AND _workspace IS NULL AND a.slug = _slug)
        OR EXISTS (
          SELECT 1 FROM public.builder_asset_domains d
          WHERE d.asset_id = a.id
            AND d.verified = true
            AND _hostname IS NOT NULL
            AND lower(d.hostname) = lower(_hostname)
            AND (_path IS NULL OR _path LIKE d.path_prefix || '%')
        )
      )
    ORDER BY a.updated_at DESC
    LIMIT 1
  )
  SELECT r.id,
         r.name,
         COALESCE(p.html, r.fallback_html),
         COALESCE(p.published_at, r.updated_at)
  FROM resolved r
  LEFT JOIN public.builder_publications p
    ON p.asset_id = r.id AND p.is_active = true
  LIMIT 1;
$function$;