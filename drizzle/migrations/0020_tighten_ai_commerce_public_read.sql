-- Restringe a leitura pública do conteúdo AI Commerce a produtos publicados na loja.
DROP POLICY IF EXISTS public_read_enabled_ai_commerce ON public.product_ai_commerce;
