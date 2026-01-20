-- =====================================================
-- Instagram Looter Module - Database Schema
-- Only accessible by metodopare workspace members
-- =====================================================

-- Configuration table for the module
CREATE TABLE public.ig_looter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rapidapi_key_configured BOOLEAN DEFAULT false,
  daily_action_limit INTEGER DEFAULT 200,
  rate_limit_seconds INTEGER DEFAULT 3,
  enabled_features JSONB DEFAULT '{"global_search":true,"hashtag":true,"location":true,"explore":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Daily usage tracking per user
CREATE TABLE public.ig_looter_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions_count INTEGER DEFAULT 0,
  searches_count INTEGER DEFAULT 0,
  profiles_viewed INTEGER DEFAULT 0,
  ai_analyses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id, usage_date)
);

-- Search history
CREATE TABLE public.ig_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('global', 'hashtag', 'location', 'explore')),
  query TEXT,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cached Instagram profiles
CREATE TABLE public.ig_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_id TEXT,
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  external_url TEXT,
  profile_pic_url TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  media_count INTEGER,
  is_business BOOLEAN,
  is_verified BOOLEAN,
  category TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  city_name TEXT,
  raw_data JSONB,
  last_fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, username)
);

-- Cached Instagram media/posts
CREATE TABLE public.ig_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.ig_profiles(id) ON DELETE CASCADE,
  instagram_media_id TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'carousel', 'reel')),
  caption TEXT,
  permalink TEXT,
  thumbnail_url TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  hashtags TEXT[],
  location_name TEXT,
  location_id TEXT,
  posted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, instagram_media_id)
);

-- Collections for organizing profiles and media
CREATE TABLE public.ig_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  tags TEXT[],
  created_by UUID NOT NULL,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items within collections (profiles or media)
CREATE TABLE public.ig_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.ig_collections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('profile', 'media')),
  profile_id UUID REFERENCES public.ig_profiles(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.ig_media(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_profile_in_collection UNIQUE(collection_id, profile_id),
  CONSTRAINT unique_media_in_collection UNIQUE(collection_id, media_id),
  CONSTRAINT item_must_have_reference CHECK (
    (item_type = 'profile' AND profile_id IS NOT NULL) OR
    (item_type = 'media' AND media_id IS NOT NULL)
  )
);

-- AI profile analysis insights
CREATE TABLE public.ig_ai_profile_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.ig_profiles(id) ON DELETE CASCADE,
  is_individual BOOLEAN,
  category_guess TEXT,
  specialty_guess TEXT,
  city_guess TEXT,
  works_at TEXT,
  contact_signals TEXT[],
  confidence DECIMAL(3,2),
  reasons TEXT[],
  red_flags TEXT[],
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_score_breakdown JSONB,
  posting_frequency TEXT,
  avg_engagement DECIMAL(8,2),
  last_post_days_ago INTEGER,
  analyzed_by UUID,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, profile_id)
);

-- AI media analysis insights
CREATE TABLE public.ig_ai_media_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.ig_media(id) ON DELETE CASCADE,
  content_type TEXT CHECK (content_type IN ('educativo', 'promo', 'prova_social', 'antes_depois', 'bastidores', 'outro')),
  tone TEXT CHECK (tone IN ('formal', 'informal')),
  has_cta BOOLEAN,
  approach_suggestion TEXT,
  analyzed_by UUID,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, media_id)
);

-- Generated leads from Instagram profiles
CREATE TABLE public.ig_generated_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.ig_profiles(id),
  insight_id UUID REFERENCES public.ig_ai_profile_insights(id),
  crm_lead_id UUID REFERENCES public.leads(id),
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'synced', 'error')),
  sync_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ig_profiles_workspace ON public.ig_profiles(workspace_id);
CREATE INDEX idx_ig_profiles_username ON public.ig_profiles(username);
CREATE INDEX idx_ig_media_workspace ON public.ig_media(workspace_id);
CREATE INDEX idx_ig_media_profile ON public.ig_media(profile_id);
CREATE INDEX idx_ig_searches_workspace ON public.ig_searches(workspace_id);
CREATE INDEX idx_ig_collections_workspace ON public.ig_collections(workspace_id);
CREATE INDEX idx_ig_ai_profile_insights_workspace ON public.ig_ai_profile_insights(workspace_id);
CREATE INDEX idx_ig_ai_profile_insights_score ON public.ig_ai_profile_insights(lead_score DESC);
CREATE INDEX idx_ig_generated_leads_workspace ON public.ig_generated_leads(workspace_id);
CREATE INDEX idx_ig_looter_usage_date ON public.ig_looter_usage(workspace_id, usage_date);

-- =====================================================
-- Row Level Security Policies
-- Only metodopare workspace members can access
-- =====================================================

ALTER TABLE public.ig_looter_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_looter_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_ai_profile_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_ai_media_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_generated_leads ENABLE ROW LEVEL SECURITY;

-- Helper function to check metodopare workspace membership
CREATE OR REPLACE FUNCTION public.is_metodopare_member(check_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspaces w
    JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = check_workspace_id
      AND w.slug = 'metodopare'
      AND wm.user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid());
END;
$$;

-- RLS Policies for ig_looter_config
CREATE POLICY "Metodopare members can view ig_looter_config"
  ON public.ig_looter_config FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare admins can manage ig_looter_config"
  ON public.ig_looter_config FOR ALL
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_looter_config.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_looter_config.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- RLS Policies for ig_looter_usage
CREATE POLICY "Metodopare members can view own usage"
  ON public.ig_looter_usage FOR SELECT
  USING (public.is_metodopare_member(workspace_id) AND user_id = auth.uid());

CREATE POLICY "Metodopare admins can view all usage"
  ON public.ig_looter_usage FOR SELECT
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_looter_usage.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Metodopare members can manage own usage"
  ON public.ig_looter_usage FOR ALL
  USING (public.is_metodopare_member(workspace_id) AND user_id = auth.uid())
  WITH CHECK (public.is_metodopare_member(workspace_id) AND user_id = auth.uid());

-- RLS Policies for ig_searches
CREATE POLICY "Metodopare members can view searches"
  ON public.ig_searches FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare members can create searches"
  ON public.ig_searches FOR INSERT
  WITH CHECK (public.is_metodopare_member(workspace_id) AND user_id = auth.uid());

-- RLS Policies for ig_profiles
CREATE POLICY "Metodopare members can view profiles"
  ON public.ig_profiles FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare members can manage profiles"
  ON public.ig_profiles FOR ALL
  USING (public.is_metodopare_member(workspace_id))
  WITH CHECK (public.is_metodopare_member(workspace_id));

-- RLS Policies for ig_media
CREATE POLICY "Metodopare members can view media"
  ON public.ig_media FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare members can manage media"
  ON public.ig_media FOR ALL
  USING (public.is_metodopare_member(workspace_id))
  WITH CHECK (public.is_metodopare_member(workspace_id));

-- RLS Policies for ig_collections (agent role = editor equivalent)
CREATE POLICY "Metodopare members can view collections"
  ON public.ig_collections FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare agents can manage collections"
  ON public.ig_collections FOR ALL
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_collections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_collections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- RLS Policies for ig_collection_items
CREATE POLICY "Metodopare members can view collection items"
  ON public.ig_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ig_collections c
      WHERE c.id = ig_collection_items.collection_id
      AND public.is_metodopare_member(c.workspace_id)
    )
  );

CREATE POLICY "Metodopare agents can manage collection items"
  ON public.ig_collection_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ig_collections c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = ig_collection_items.collection_id
      AND public.is_metodopare_member(c.workspace_id)
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'agent')
    )
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ig_collections c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = ig_collection_items.collection_id
      AND public.is_metodopare_member(c.workspace_id)
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'agent')
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policies for ig_ai_profile_insights
CREATE POLICY "Metodopare members can view profile insights"
  ON public.ig_ai_profile_insights FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare agents can manage profile insights"
  ON public.ig_ai_profile_insights FOR ALL
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_ai_profile_insights.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_ai_profile_insights.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- RLS Policies for ig_ai_media_insights
CREATE POLICY "Metodopare members can view media insights"
  ON public.ig_ai_media_insights FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare agents can manage media insights"
  ON public.ig_ai_media_insights FOR ALL
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_ai_media_insights.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_ai_media_insights.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- RLS Policies for ig_generated_leads
CREATE POLICY "Metodopare members can view generated leads"
  ON public.ig_generated_leads FOR SELECT
  USING (public.is_metodopare_member(workspace_id));

CREATE POLICY "Metodopare agents can manage generated leads"
  ON public.ig_generated_leads FOR ALL
  USING (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_generated_leads.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (
    public.is_metodopare_member(workspace_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ig_generated_leads.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- Trigger to update collection items count
CREATE OR REPLACE FUNCTION public.update_ig_collection_items_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ig_collections
    SET items_count = items_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ig_collections
    SET items_count = GREATEST(0, items_count - 1), updated_at = now()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_ig_collection_items_count
AFTER INSERT OR DELETE ON public.ig_collection_items
FOR EACH ROW EXECUTE FUNCTION public.update_ig_collection_items_count();