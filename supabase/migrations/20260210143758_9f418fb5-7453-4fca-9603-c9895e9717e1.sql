
-- Store Ad Placements & Ads
CREATE TABLE public.store_ad_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  width INT,
  height INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_ad_placements_public_read" ON public.store_ad_placements FOR SELECT USING (true);
CREATE POLICY "store_ad_placements_admin_all" ON public.store_ad_placements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = store_ad_placements.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TABLE public.store_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES public.store_ad_placements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  alt_text TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_ads_public_read" ON public.store_ads FOR SELECT USING (true);
CREATE POLICY "store_ads_admin_all" ON public.store_ads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = store_ads.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_store_ads_updated_at
BEFORE UPDATE ON public.store_ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sponsored C2C Listings
CREATE TABLE public.c2c_sponsored_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  stripe_payment_id TEXT,
  is_active BOOLEAN DEFAULT true,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.c2c_sponsored_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c2c_sponsored_public_read" ON public.c2c_sponsored_listings FOR SELECT USING (true);
CREATE POLICY "c2c_sponsored_seller_insert" ON public.c2c_sponsored_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "c2c_sponsored_admin_all" ON public.c2c_sponsored_listings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_sponsored_listings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Store Sponsors (Partners)
CREATE TABLE public.store_sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('gold','silver','bronze')),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_sponsors_public_read" ON public.store_sponsors FOR SELECT USING (true);
CREATE POLICY "store_sponsors_admin_all" ON public.store_sponsors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = store_sponsors.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_store_sponsors_updated_at
BEFORE UPDATE ON public.store_sponsors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
