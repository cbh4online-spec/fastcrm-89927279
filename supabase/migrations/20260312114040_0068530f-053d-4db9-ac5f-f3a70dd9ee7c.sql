ALTER TABLE public.funnel_products
ADD CONSTRAINT funnel_products_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;