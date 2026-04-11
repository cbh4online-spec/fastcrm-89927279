
-- Table: seller reviews
CREATE TABLE public.c2c_seller_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  order_id UUID,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_reported BOOLEAN NOT NULL DEFAULT false,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_review_per_order UNIQUE (buyer_id, order_id)
);

ALTER TABLE public.c2c_seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view reviews"
  ON public.c2c_seller_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Buyers can create reviews"
  ON public.c2c_seller_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews"
  ON public.c2c_seller_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE INDEX idx_c2c_seller_reviews_seller ON public.c2c_seller_reviews(seller_id);
CREATE INDEX idx_c2c_seller_reviews_workspace ON public.c2c_seller_reviews(workspace_id);

-- Table: seller endorsements
CREATE TABLE public.c2c_seller_endorsements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  endorser_id UUID NOT NULL,
  message TEXT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_endorsement_per_pair UNIQUE (endorser_id, seller_id)
);

ALTER TABLE public.c2c_seller_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view endorsements"
  ON public.c2c_seller_endorsements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create endorsements"
  ON public.c2c_seller_endorsements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = endorser_id AND endorser_id != seller_id);

CREATE POLICY "Users can delete their own endorsements"
  ON public.c2c_seller_endorsements FOR DELETE
  TO authenticated
  USING (auth.uid() = endorser_id);

CREATE INDEX idx_c2c_seller_endorsements_seller ON public.c2c_seller_endorsements(seller_id);

-- Function: get seller stats
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_seller_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'avg_rating', COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM c2c_seller_reviews WHERE seller_id = p_seller_id), 0),
    'total_reviews', (SELECT COUNT(*) FROM c2c_seller_reviews WHERE seller_id = p_seller_id),
    'total_endorsements', (SELECT COUNT(*) FROM c2c_seller_endorsements WHERE seller_id = p_seller_id)
  );
$$;

-- Trigger for updated_at on reviews
CREATE TRIGGER update_c2c_seller_reviews_updated_at
  BEFORE UPDATE ON public.c2c_seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
