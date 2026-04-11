
-- Create followers table
CREATE TABLE public.c2c_seller_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, follower_id)
);

-- Indexes
CREATE INDEX idx_c2c_seller_followers_seller ON public.c2c_seller_followers(seller_id);
CREATE INDEX idx_c2c_seller_followers_follower ON public.c2c_seller_followers(follower_id);

-- Enable RLS
ALTER TABLE public.c2c_seller_followers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view followers"
  ON public.c2c_seller_followers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can follow sellers"
  ON public.c2c_seller_followers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.c2c_seller_followers FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Function to get follower count
CREATE OR REPLACE FUNCTION public.get_seller_follower_count(p_seller_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM c2c_seller_followers WHERE seller_id = p_seller_id;
$$;
