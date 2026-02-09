-- Reviews table
CREATE TABLE public.store_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.store_reviews FOR SELECT
  USING (is_approved = true);

-- Authenticated users can create reviews
CREATE POLICY "Users can create their own reviews"
  ON public.store_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.store_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.store_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Wishlist table
CREATE TABLE public.store_wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.store_wishlist ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wishlist
CREATE POLICY "Users can view their own wishlist"
  ON public.store_wishlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their wishlist"
  ON public.store_wishlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their wishlist"
  ON public.store_wishlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also ensure store_orders has a SELECT policy for users to see their own orders
CREATE POLICY "Users can view their own orders"
  ON public.store_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for reviews updated_at
CREATE TRIGGER update_store_reviews_updated_at
  BEFORE UPDATE ON public.store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
