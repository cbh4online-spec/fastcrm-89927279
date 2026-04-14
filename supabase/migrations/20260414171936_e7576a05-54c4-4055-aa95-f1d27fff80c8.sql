
-- Function to increment viewer count (best-effort, called on page load)
CREATE OR REPLACE FUNCTION public.increment_viewer_count(p_livestream_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE c2c_livestreams
  SET viewer_count = viewer_count + 1,
      total_views = total_views + 1,
      peak_viewers = GREATEST(peak_viewers, viewer_count + 1)
  WHERE id = p_livestream_id AND status = 'live';
END;
$$;

-- Function to decrement viewer count (best-effort, called on page unload)
CREATE OR REPLACE FUNCTION public.decrement_viewer_count(p_livestream_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE c2c_livestreams
  SET viewer_count = GREATEST(0, viewer_count - 1)
  WHERE id = p_livestream_id AND status = 'live';
END;
$$;

-- Function to auto-end ghost lives (lives that have been "live" for more than 4 hours)
CREATE OR REPLACE FUNCTION public.cleanup_ghost_livestreams()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE c2c_livestreams
  SET status = 'ended',
      ended_at = now()
  WHERE status = 'live'
    AND started_at < now() - interval '4 hours';
  
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
