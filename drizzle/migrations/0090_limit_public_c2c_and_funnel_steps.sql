-- Seguidores: cada um vê os seus; o vendedor vê os seus seguidores; contagem pública via função
DROP POLICY IF EXISTS "Anyone authenticated can view followers" ON public.c2c_seller_followers;
CREATE POLICY "Follower or seller can view follows" ON public.c2c_seller_followers
  FOR SELECT TO authenticated USING (follower_id = auth.uid() OR seller_id = auth.uid());

CREATE OR REPLACE FUNCTION public.c2c_seller_follower_count(p_seller_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.c2c_seller_followers WHERE seller_id = p_seller_id
$$;
GRANT EXECUTE ON FUNCTION public.c2c_seller_follower_count(uuid) TO anon, authenticated;

-- Diretos: públicos só agendados/ao vivo/terminados; o vendedor vê os seus; a chave de transmissão nunca é legível pela app
DROP POLICY IF EXISTS "Anyone can view livestreams" ON public.c2c_livestreams;
CREATE POLICY "Public can view published livestreams" ON public.c2c_livestreams
  FOR SELECT USING (status IN ('scheduled','live','ended') OR seller_id = auth.uid());
REVOKE SELECT (mux_stream_key) ON public.c2c_livestreams FROM anon, authenticated;
REVOKE SELECT ON public.c2c_livestreams FROM anon, authenticated;
GRANT SELECT (id, workspace_id, seller_id, title, description, status, thumbnail_url, scheduled_at, started_at, ended_at, viewer_count, peak_viewers, total_views, product_ids, category, tags, replay_available, created_at, updated_at, workspace_slug, mux_stream_id, mux_playback_id, featured_product_id, livekit_room_name) ON public.c2c_livestreams TO anon, authenticated;

-- Passos do checkout: públicos só de funis ativos
DROP POLICY IF EXISTS public_read_funnel_steps ON public.checkout_funnel_steps;
CREATE POLICY public_read_active_funnel_steps ON public.checkout_funnel_steps
  FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.checkout_funnels f WHERE f.id = funnel_id AND f.is_active = true));