CREATE OR REPLACE FUNCTION public.sync_product_images_array(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.products p
  SET images = COALESCE(agg.urls, p.images),
      primary_image_index = CASE WHEN agg.urls IS NOT NULL AND array_length(agg.urls, 1) > 0 THEN 0 ELSE p.primary_image_index END
  FROM (
    SELECT array_agg(pi.url ORDER BY pi.is_cover DESC NULLS LAST, pi.position ASC NULLS LAST, pi.created_at ASC) AS urls
    FROM public.product_images pi
    WHERE pi.product_id = p_product_id
      AND pi.url IS NOT NULL
      AND length(trim(pi.url)) > 0
  ) agg
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_product_images_array()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_product_images_array(OLD.product_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_product_images_array(NEW.product_id);
  IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    PERFORM public.sync_product_images_array(OLD.product_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_images_sync_array ON public.product_images;
CREATE TRIGGER product_images_sync_array
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_product_images_array();

-- Backfill: produtos com galeria preenchida passam a ter a lista pública sincronizada
UPDATE public.products p
SET images = agg.urls,
    primary_image_index = 0
FROM (
  SELECT pi.product_id,
         array_agg(pi.url ORDER BY pi.is_cover DESC NULLS LAST, pi.position ASC NULLS LAST, pi.created_at ASC) AS urls
  FROM public.product_images pi
  WHERE pi.url IS NOT NULL AND length(trim(pi.url)) > 0
  GROUP BY pi.product_id
) agg
WHERE p.id = agg.product_id
  AND p.images IS DISTINCT FROM agg.urls;
