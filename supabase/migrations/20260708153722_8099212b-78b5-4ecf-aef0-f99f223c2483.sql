
-- workspaces: revoke all columns from anon, then grant only public-safe ones
REVOKE SELECT ON public.workspaces FROM anon;
GRANT SELECT (
  id, name, slug, status, company_status, logo_url,
  primary_color, secondary_color, ui_mode, website,
  linkedin_url, facebook_url, instagram_url, twitter_url,
  company_name, created_at, updated_at
) ON public.workspaces TO anon;

-- c2c_livestreams: hide streaming credentials from anon
REVOKE SELECT ON public.c2c_livestreams FROM anon;
GRANT SELECT (
  id, workspace_id, workspace_slug, seller_id, title, description,
  status, thumbnail_url, scheduled_at, started_at, ended_at,
  viewer_count, peak_viewers, total_views, product_ids, category,
  tags, replay_available, created_at, updated_at,
  mux_playback_id, featured_product_id
) ON public.c2c_livestreams TO anon;

-- product_qa: hide asker_name from anon
REVOKE SELECT ON public.product_qa FROM anon;
GRANT SELECT (
  id, workspace_id, product_id, question, answer, source,
  bot_profile_id, is_approved, moderated_by, moderated_at,
  created_at, updated_at
) ON public.product_qa TO anon;

-- landing_pages: hide internal metadata from anon
REVOKE SELECT ON public.landing_pages FROM anon;
GRANT SELECT (
  id, title, slug, headline, subheadline, cta_text, cta_color,
  hero_image_url, features, testimonials, form_enabled, form_title,
  form_fields, custom_css, custom_html, custom_html_updated_at,
  is_published, published_at, page_type, created_at, updated_at
) ON public.landing_pages TO anon;
