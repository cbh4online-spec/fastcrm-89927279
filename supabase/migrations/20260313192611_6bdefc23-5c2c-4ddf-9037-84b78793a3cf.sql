
-- Tabela de configuração do marketplace por workspace
CREATE TABLE IF NOT EXISTS c2c_marketplace_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  favicon_url TEXT,
  theme JSONB DEFAULT '{"primaryColor":"#6366f1","secondaryColor":"#f59e0b","backgroundColor":"#ffffff","textColor":"#1f2937","fontFamily":"Inter"}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image_url TEXT,
  settings JSONB DEFAULT '{"allowGuestBrowsing":true,"requireLoginToContact":true,"showSellerPhone":false,"showSellerEmail":false,"enableMessaging":true,"enableOffers":true,"enableBoost":true,"moderateListings":true,"categoriesEnabled":true,"searchEnabled":true,"filtersEnabled":true}',
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  boost_price_day INTEGER DEFAULT 500,
  featured_price_week INTEGER DEFAULT 2000,
  categories JSONB DEFAULT '[]',
  support_email TEXT,
  support_phone TEXT,
  social_links JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,
  total_listings INTEGER DEFAULT 0,
  total_sellers INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_c2c_marketplace_slug ON c2c_marketplace_config(slug);

ALTER TABLE c2c_marketplace_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active marketplaces" ON c2c_marketplace_config
  FOR SELECT USING (status = 'active');

CREATE POLICY "Workspace members can manage marketplace config" ON c2c_marketplace_config
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Add columns to c2c_listings if missing
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT false;
ALTER TABLE c2c_listings ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_c2c_listings_slug ON c2c_listings(workspace_id, slug);

-- Trigger to generate slug for listings
CREATE OR REPLACE FUNCTION generate_c2c_listing_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(COALESCE(NEW.title, 'listing'), '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS c2c_listing_slug_trigger ON c2c_listings;
CREATE TRIGGER c2c_listing_slug_trigger
BEFORE INSERT ON c2c_listings
FOR EACH ROW EXECUTE FUNCTION generate_c2c_listing_slug();

-- Update existing listings without slug
UPDATE c2c_listings 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(COALESCE(title, 'listing'), '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTRING(id::TEXT, 1, 8)
WHERE slug IS NULL;

-- RPC to increment views
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE c2c_listings 
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
