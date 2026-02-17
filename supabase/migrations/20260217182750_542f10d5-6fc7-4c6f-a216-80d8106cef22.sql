
-- Function to aggregate bio events into daily summaries
CREATE OR REPLACE FUNCTION public.aggregate_bio_analytics_daily(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_top_links JSONB;
  v_top_sources JSONB;
BEGIN
  FOR rec IN
    SELECT
      bio_page_id,
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS uniques,
      COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'lead') AS leads
    FROM bio_events
    WHERE created_at::date = target_date
    GROUP BY bio_page_id
  LOOP
    -- Top links (blocks most clicked)
    SELECT COALESCE(jsonb_agg(jsonb_build_object('url', block_id, 'clicks', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_top_links
    FROM (
      SELECT block_id, COUNT(*) AS cnt
      FROM bio_events
      WHERE bio_page_id = rec.bio_page_id
        AND created_at::date = target_date
        AND event_type = 'click'
        AND block_id IS NOT NULL
      GROUP BY block_id
      ORDER BY cnt DESC
      LIMIT 10
    ) sub;

    -- Top sources (referrers)
    SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_top_sources
    FROM (
      SELECT COALESCE(source, 'direct') AS source, COUNT(*) AS cnt
      FROM bio_events
      WHERE bio_page_id = rec.bio_page_id
        AND created_at::date = target_date
        AND event_type = 'page_view'
      GROUP BY COALESCE(source, 'direct')
      ORDER BY cnt DESC
      LIMIT 10
    ) sub;

    -- Upsert into bio_analytics_daily
    INSERT INTO bio_analytics_daily (bio_page_id, date, views, uniques, clicks, leads, top_links, top_sources)
    VALUES (rec.bio_page_id, target_date, rec.views, rec.uniques, rec.clicks, rec.leads, v_top_links, v_top_sources)
    ON CONFLICT (bio_page_id, date)
    DO UPDATE SET
      views = EXCLUDED.views,
      uniques = EXCLUDED.uniques,
      clicks = EXCLUDED.clicks,
      leads = EXCLUDED.leads,
      top_links = EXCLUDED.top_links,
      top_sources = EXCLUDED.top_sources;
  END LOOP;
END;
$$;

-- Schedule daily aggregation at 02:00 UTC
SELECT cron.schedule(
  'aggregate-bio-analytics-daily',
  '0 2 * * *',
  $$SELECT public.aggregate_bio_analytics_daily()$$
);

-- Backfill: aggregate all historical dates
DO $$
DECLARE
  d DATE;
BEGIN
  FOR d IN
    SELECT DISTINCT created_at::date AS event_date
    FROM bio_events
    ORDER BY event_date
  LOOP
    PERFORM public.aggregate_bio_analytics_daily(d);
  END LOOP;
END;
$$;
