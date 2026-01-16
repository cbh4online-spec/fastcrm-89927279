
-- Create enum for feed types
CREATE TYPE public.feed_type AS ENUM ('workspace', 'team', 'user', 'client');

-- Create enum for post types
CREATE TYPE public.post_type AS ENUM ('update', 'help_request', 'daily_checklist', 'winners', 'ai_alert');

-- Create internal_posts table
CREATE TABLE public.internal_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  feed_type feed_type NOT NULL DEFAULT 'workspace',
  target_team_id UUID NULL,
  target_user_id UUID NULL,
  target_client_id UUID NULL,
  post_type post_type NOT NULL DEFAULT 'update',
  title TEXT NULL,
  content TEXT NOT NULL,
  checklist_items JSONB NULL DEFAULT '[]'::jsonb,
  attachments JSONB NULL DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  ai_generated BOOLEAN DEFAULT false,
  ai_source TEXT NULL,
  metadata JSONB NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.internal_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  attachments JSONB NULL DEFAULT '[]'::jsonb,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NULL REFERENCES public.internal_posts(id) ON DELETE CASCADE,
  comment_id UUID NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reaction_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_post_reaction UNIQUE (post_id, user_id, reaction_type),
  CONSTRAINT unique_comment_reaction UNIQUE (comment_id, user_id, reaction_type)
);

-- Create post_mentions table
CREATE TABLE public.post_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NULL REFERENCES public.internal_posts(id) ON DELETE CASCADE,
  comment_id UUID NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by UUID NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mention_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.internal_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_posts
CREATE POLICY "Users can view posts in their workspace"
  ON public.internal_posts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create posts in their workspace"
  ON public.internal_posts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) AND author_id = auth.uid()
  );

CREATE POLICY "Authors can update their posts"
  ON public.internal_posts FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their posts"
  ON public.internal_posts FOR DELETE
  USING (author_id = auth.uid());

-- RLS Policies for post_comments
CREATE POLICY "Users can view comments on accessible posts"
  ON public.post_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.internal_posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    post_id IN (
      SELECT id FROM public.internal_posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ) AND author_id = auth.uid()
  );

CREATE POLICY "Authors can update their comments"
  ON public.post_comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their comments"
  ON public.post_comments FOR DELETE
  USING (author_id = auth.uid());

-- RLS Policies for post_reactions
CREATE POLICY "Users can view reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.post_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions"
  ON public.post_reactions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for post_mentions
CREATE POLICY "Users can view their mentions"
  ON public.post_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid() OR mentioned_by = auth.uid());

CREATE POLICY "Users can create mentions"
  ON public.post_mentions FOR INSERT
  WITH CHECK (mentioned_by = auth.uid());

CREATE POLICY "Mentioned users can update their mentions"
  ON public.post_mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Indexes
CREATE INDEX idx_internal_posts_workspace ON public.internal_posts(workspace_id);
CREATE INDEX idx_internal_posts_author ON public.internal_posts(author_id);
CREATE INDEX idx_internal_posts_feed_type ON public.internal_posts(feed_type);
CREATE INDEX idx_internal_posts_created ON public.internal_posts(created_at DESC);
CREATE INDEX idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_comment ON public.post_reactions(comment_id);
CREATE INDEX idx_post_mentions_user ON public.post_mentions(mentioned_user_id);

-- Triggers for updated_at
CREATE TRIGGER update_internal_posts_updated_at
  BEFORE UPDATE ON public.internal_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
