-- Descontinuar tabelas duplicadas do checkout B2B (substituídas por product_kits + product_cross_sells)
DROP TABLE IF EXISTS public.b2b_checkout_kits CASCADE;
DROP TABLE IF EXISTS public.b2b_checkout_related_rules CASCADE;