
-- Livestreams table
CREATE TABLE public.c2c_livestreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  product_ids UUID[] DEFAULT '{}',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  replay_available BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Livestream messages (chat)
CREATE TABLE public.c2c_livestream_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestream_id UUID NOT NULL REFERENCES public.c2c_livestreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'product_highlight', 'pinned')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Livestream viewers tracking
CREATE TABLE public.c2c_livestream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestream_id UUID NOT NULL REFERENCES public.c2c_livestreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(livestream_id, user_id)
);

-- Enable RLS
ALTER TABLE public.c2c_livestreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_livestream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_livestream_viewers ENABLE ROW LEVEL SECURITY;

-- RLS: Livestreams - anyone can view active/live, owners can manage
CREATE POLICY "Anyone can view livestreams" ON public.c2c_livestreams
  FOR SELECT USING (true);

CREATE POLICY "Sellers can create livestreams" ON public.c2c_livestreams
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own livestreams" ON public.c2c_livestreams
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own livestreams" ON public.c2c_livestreams
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid());

-- RLS: Messages - anyone can read, authenticated can send
CREATE POLICY "Anyone can view livestream messages" ON public.c2c_livestream_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.c2c_livestream_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: Viewers - anyone can view counts, authenticated can join
CREATE POLICY "Anyone can view livestream viewers" ON public.c2c_livestream_viewers
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join livestreams" ON public.c2c_livestream_viewers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own viewer record" ON public.c2c_livestream_viewers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_livestream_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_livestreams;

-- Index for performance
CREATE INDEX idx_c2c_livestreams_status ON public.c2c_livestreams(status);
CREATE INDEX idx_c2c_livestreams_workspace ON public.c2c_livestreams(workspace_id);
CREATE INDEX idx_c2c_livestream_messages_stream ON public.c2c_livestream_messages(livestream_id, created_at);
