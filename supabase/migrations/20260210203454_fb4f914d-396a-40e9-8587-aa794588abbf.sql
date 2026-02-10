
-- Add rating aggregation columns to sellers
ALTER TABLE public.c2c_sellers
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Notification trigger: new review for seller
CREATE OR REPLACE FUNCTION public.notify_seller_new_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    workspace_id, user_id, type, title, message, metadata
  )
  SELECT
    NEW.workspace_id,
    s.user_id,
    'c2c_review',
    'Nova avaliação recebida',
    'Recebeste uma avaliação de ' || NEW.rating || ' estrelas',
    jsonb_build_object('review_id', NEW.id, 'listing_id', NEW.listing_id, 'rating', NEW.rating)
  FROM c2c_sellers s WHERE s.id = NEW.seller_id;

  UPDATE c2c_sellers SET
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM c2c_reviews WHERE seller_id = NEW.seller_id AND is_visible = true),
    total_reviews = (SELECT COUNT(*) FROM c2c_reviews WHERE seller_id = NEW.seller_id AND is_visible = true)
  WHERE id = NEW.seller_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_c2c_review_created ON public.c2c_reviews;
CREATE TRIGGER on_c2c_review_created
  AFTER INSERT ON public.c2c_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_review();

-- Notification trigger: C2C sale
CREATE OR REPLACE FUNCTION public.notify_seller_c2c_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.admin_notifications (
      workspace_id, user_id, type, title, message, metadata
    )
    SELECT
      NEW.workspace_id,
      s.user_id,
      'c2c_sale',
      'Nova venda!',
      'Vendeste um artigo por ' || NEW.sale_amount || '€',
      jsonb_build_object('commission_id', NEW.id, 'listing_id', NEW.listing_id, 'amount', NEW.sale_amount)
    FROM c2c_sellers s WHERE s.id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_c2c_sale_created ON public.c2c_commissions;
CREATE TRIGGER on_c2c_sale_created
  AFTER INSERT ON public.c2c_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_c2c_sale();

-- Notification trigger: seller status change
CREATE OR REPLACE FUNCTION public.notify_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.admin_notifications (
      workspace_id, user_id, type, title, message, metadata
    )
    VALUES (
      NEW.workspace_id,
      NEW.user_id,
      'c2c_seller_status',
      CASE WHEN NEW.status = 'approved' THEN 'Candidatura aprovada!' ELSE 'Candidatura rejeitada' END,
      CASE WHEN NEW.status = 'approved' THEN 'Parabéns! A tua candidatura de vendedor foi aprovada.'
           ELSE 'A tua candidatura foi rejeitada: ' || COALESCE(NEW.rejection_reason, 'Sem motivo especificado') END,
      jsonb_build_object('seller_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_c2c_seller_status_change ON public.c2c_sellers;
CREATE TRIGGER on_c2c_seller_status_change
  AFTER UPDATE ON public.c2c_sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_status_change();
