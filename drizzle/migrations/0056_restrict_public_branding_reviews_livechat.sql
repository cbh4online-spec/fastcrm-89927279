-- Workspaces: anon only sees branding columns
REVOKE SELECT ON public.workspaces FROM anon;
GRANT SELECT (id, name, slug, status, company_name, logo_url, primary_color, secondary_color, website, linkedin_url, facebook_url, instagram_url, twitter_url, ui_mode, created_at) ON public.workspaces TO anon;

-- c2c_reviews: hide buyer_email
REVOKE SELECT ON public.c2c_reviews FROM anon, authenticated;
GRANT SELECT (id, workspace_id, listing_id, reviewer_id, seller_id, rating, comment, created_at, transaction_id, title, reply, reply_at, is_verified_purchase, is_hidden) ON public.c2c_reviews TO anon, authenticated;

-- live chat: only messages of published sessions
DROP POLICY IF EXISTS live_chat_messages_select_public ON public.live_chat_messages;
CREATE POLICY live_chat_messages_select_published ON public.live_chat_messages
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = live_chat_messages.live_session_id AND s.status IN ('scheduled','live','ended')));