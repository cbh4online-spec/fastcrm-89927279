ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS unit_price_precise numeric(14,6);

UPDATE public.invoice_items
  SET unit_price_precise = unit_price
  WHERE unit_price_precise IS NULL;

COMMENT ON COLUMN public.invoice_items.unit_price_precise IS
  'Preco unitario com ate 6 casas decimais, usado quando o total da linha e definido manualmente. unit_price mantem o valor arredondado a 2 casas para compatibilidade.';