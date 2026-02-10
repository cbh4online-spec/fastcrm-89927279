
-- Loyalty Points
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_points_own_read" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loyalty_points_own_update" ON public.loyalty_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "loyalty_points_insert" ON public.loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loyalty_points_admin" ON public.loyalty_points FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = loyalty_points.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_loyalty_points_updated_at
BEFORE UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn','redeem','bonus','referral','review','adjustment')),
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_transactions_own" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loyalty_transactions_insert" ON public.loyalty_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loyalty_transactions_admin" ON public.loyalty_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = loyalty_transactions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Loyalty Rewards
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percent','discount_fixed','free_shipping','free_product')),
  reward_value NUMERIC,
  min_tier TEXT DEFAULT 'bronze',
  is_active BOOLEAN DEFAULT true,
  stock INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_rewards_public_read" ON public.loyalty_rewards FOR SELECT USING (true);
CREATE POLICY "loyalty_rewards_admin_all" ON public.loyalty_rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = loyalty_rewards.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Forum Categories
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_categories_public_read" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "forum_categories_admin_all" ON public.forum_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = forum_categories.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Forum Topics
CREATE TABLE public.forum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved','flagged','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_topics_public_read" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "forum_topics_author_insert" ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_topics_author_update" ON public.forum_topics FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_topics_admin_all" ON public.forum_topics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = forum_topics.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_forum_topics_updated_at
BEFORE UPDATE ON public.forum_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forum Posts (replies)
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_best_answer BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved','flagged','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_public_read" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_author_insert" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_posts_author_update" ON public.forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_posts_admin_all" ON public.forum_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = forum_posts.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forum Reactions
CREATE TABLE public.forum_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like','helpful','agree')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type),
  UNIQUE(topic_id, user_id, reaction_type)
);
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_reactions_public_read" ON public.forum_reactions FOR SELECT USING (true);
CREATE POLICY "forum_reactions_own" ON public.forum_reactions FOR ALL USING (auth.uid() = user_id);

-- Exclusive Content
CREATE TABLE public.exclusive_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT,
  content_type TEXT DEFAULT 'article' CHECK (content_type IN ('article','offer','early_access')),
  min_tier TEXT DEFAULT 'bronze' CHECK (min_tier IN ('bronze','silver','gold','platinum')),
  image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exclusive_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exclusive_content_public_read" ON public.exclusive_content FOR SELECT USING (true);
CREATE POLICY "exclusive_content_admin_all" ON public.exclusive_content FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = exclusive_content.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_exclusive_content_updated_at
BEFORE UPDATE ON public.exclusive_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Moderation Filters (transversal)
CREATE TABLE public.moderation_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  banned_words TEXT[] DEFAULT '{}',
  regex_patterns TEXT[] DEFAULT '{}',
  auto_flag_threshold INT DEFAULT 3,
  max_reports_before_hide INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_filters_admin" ON public.moderation_filters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = moderation_filters.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE TRIGGER update_moderation_filters_updated_at
BEFORE UPDATE ON public.moderation_filters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Moderation Queue
CREATE TABLE public.moderation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('c2c_listing','forum_topic','forum_post','review')),
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  flagged_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_queue_admin" ON public.moderation_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = moderation_queue.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

-- Indexes
CREATE INDEX idx_forum_topics_category ON public.forum_topics(category_id);
CREATE INDEX idx_forum_topics_workspace ON public.forum_topics(workspace_id);
CREATE INDEX idx_forum_posts_topic ON public.forum_posts(topic_id);
CREATE INDEX idx_loyalty_transactions_user ON public.loyalty_transactions(user_id, workspace_id);
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(workspace_id, status);
