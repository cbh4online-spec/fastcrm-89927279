-- Auto-update seller stats when a review is inserted
CREATE OR REPLACE FUNCTION public.update_seller_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE c2c_sellers
  SET 
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM c2c_reviews WHERE seller_id = NEW.seller_id),
    total_reviews = (SELECT COUNT(*) FROM c2c_reviews WHERE seller_id = NEW.seller_id),
    updated_at = now()
  WHERE user_id = NEW.seller_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_seller_review_stats ON c2c_reviews;
CREATE TRIGGER trg_update_seller_review_stats
AFTER INSERT OR DELETE ON c2c_reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_review_stats();