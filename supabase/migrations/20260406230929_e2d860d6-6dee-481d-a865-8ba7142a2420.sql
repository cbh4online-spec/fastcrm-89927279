
-- Sync product_images URLs into products.images array for products that have images in product_images but empty images array
UPDATE products p
SET images = sub.urls
FROM (
  SELECT pi.product_id, array_agg(pi.url ORDER BY pi.position) as urls
  FROM product_images pi
  GROUP BY pi.product_id
) sub
WHERE p.id = sub.product_id
  AND (p.images IS NULL OR array_length(p.images, 1) IS NULL);
