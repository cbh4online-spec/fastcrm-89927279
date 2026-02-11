
-- Corrigir funcao do trigger de preco inicial
CREATE OR REPLACE FUNCTION public.record_product_initial_price()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.product_price_history 
    (product_id, workspace_id, price, currency)
  VALUES 
    (NEW.id, NEW.workspace_id, NEW.base_price, COALESCE(NEW.currency, 'EUR'));
  RETURN NEW;
END;
$$;

-- Corrigir funcao do trigger de alteracao de preco
CREATE OR REPLACE FUNCTION public.record_product_price_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
    INSERT INTO public.product_price_history 
      (product_id, workspace_id, price, currency)
    VALUES 
      (NEW.id, NEW.workspace_id, NEW.base_price, COALESCE(NEW.currency, 'EUR'));
  END IF;
  RETURN NEW;
END;
$$;
