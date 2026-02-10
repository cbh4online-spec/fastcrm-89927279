
-- C2C Categories
CREATE TABLE public.c2c_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  parent_id UUID REFERENCES public.c2c_categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_categories_public_read" ON public.c2c_categories FOR SELECT USING (true);
CREATE POLICY "c2c_categories_admin_all" ON public.c2c_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_categories.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- C2C Listings
CREATE TABLE public.c2c_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  category_id UUID REFERENCES public.c2c_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'EUR',
  condition TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('new','like_new','used','for_parts')),
  photos TEXT[] DEFAULT '{}',
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','paused','removed','flagged')),
  views_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved','flagged','rejected')),
  moderation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_listings_public_read" ON public.c2c_listings FOR SELECT USING (true);
CREATE POLICY "c2c_listings_seller_insert" ON public.c2c_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "c2c_listings_seller_update" ON public.c2c_listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "c2c_listings_seller_delete" ON public.c2c_listings FOR DELETE USING (auth.uid() = seller_id);
CREATE POLICY "c2c_listings_admin_all" ON public.c2c_listings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_listings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE INDEX idx_c2c_listings_workspace ON public.c2c_listings(workspace_id);
CREATE INDEX idx_c2c_listings_seller ON public.c2c_listings(seller_id);
CREATE INDEX idx_c2c_listings_category ON public.c2c_listings(category_id);
CREATE INDEX idx_c2c_listings_status ON public.c2c_listings(status);

-- C2C Messages
CREATE TABLE public.c2c_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_messages_participants" ON public.c2c_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "c2c_messages_sender_insert" ON public.c2c_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "c2c_messages_receiver_update" ON public.c2c_messages FOR UPDATE USING (auth.uid() = receiver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_messages;

-- C2C Reviews
CREATE TABLE public.c2c_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_reviews_public_read" ON public.c2c_reviews FOR SELECT USING (true);
CREATE POLICY "c2c_reviews_reviewer_insert" ON public.c2c_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- C2C Favorites
CREATE TABLE public.c2c_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);
ALTER TABLE public.c2c_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_favorites_own" ON public.c2c_favorites FOR ALL USING (auth.uid() = user_id);

-- C2C Reports
CREATE TABLE public.c2c_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_reports_reporter_insert" ON public.c2c_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "c2c_reports_admin_read" ON public.c2c_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_reports.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);
CREATE POLICY "c2c_reports_admin_update" ON public.c2c_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_reports.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- C2C Moderation Settings
CREATE TABLE public.c2c_moderation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  banned_words TEXT[] DEFAULT '{}',
  max_photos INT DEFAULT 10,
  max_price NUMERIC DEFAULT 99999,
  auto_flag_new_sellers BOOLEAN DEFAULT false,
  require_photo BOOLEAN DEFAULT true,
  min_description_length INT DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_moderation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_moderation_settings_admin" ON public.c2c_moderation_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_moderation_settings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Updated_at trigger for listings
CREATE TRIGGER update_c2c_listings_updated_at
BEFORE UPDATE ON public.c2c_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for moderation settings
CREATE TRIGGER update_c2c_moderation_settings_updated_at
BEFORE UPDATE ON public.c2c_moderation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
