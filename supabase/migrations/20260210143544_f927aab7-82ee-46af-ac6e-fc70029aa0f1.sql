
-- Product Price History (auto-recorded via trigger)
CREATE TABLE public.product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_price_history_public_read" ON public.product_price_history FOR SELECT USING (true);

CREATE POLICY "product_price_history_admin_insert" ON public.product_price_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = product_price_history.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE INDEX idx_price_history_product ON public.product_price_history(product_id, recorded_at DESC);

-- Trigger to auto-record price changes
CREATE OR REPLACE FUNCTION public.record_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price OR OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price THEN
    INSERT INTO public.product_price_history (product_id, workspace_id, price, compare_at_price, currency)
    VALUES (NEW.id, NEW.workspace_id, NEW.price, NEW.compare_at_price, COALESCE(NEW.currency, 'EUR'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_record_price_change
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.record_product_price_change();

-- Also record initial price on insert
CREATE OR REPLACE FUNCTION public.record_product_initial_price()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.product_price_history (product_id, workspace_id, price, compare_at_price, currency)
  VALUES (NEW.id, NEW.workspace_id, NEW.price, NEW.compare_at_price, COALESCE(NEW.currency, 'EUR'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_record_initial_price
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.record_product_initial_price();

-- External price cache
CREATE TABLE public.product_external_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.product_external_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_external_prices_public_read" ON public.product_external_prices FOR SELECT USING (true);
CREATE POLICY "product_external_prices_admin_all" ON public.product_external_prices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = product_external_prices.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
);

CREATE INDEX idx_external_prices_product ON public.product_external_prices(product_id, fetched_at DESC);
