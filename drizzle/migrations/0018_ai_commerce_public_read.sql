-- Leitura pública apenas dos metadados AI de produtos com AI Commerce ativo.
-- Necessário para emitir dados estruturados (FAQ) na ficha pública do produto.
GRANT SELECT ON public.product_ai_commerce TO anon;

CREATE POLICY "public_read_enabled_ai_commerce"
ON public.product_ai_commerce
FOR SELECT
TO anon
USING (ai_commerce_enabled = true);