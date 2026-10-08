CREATE OR REPLACE FUNCTION public.is_valid_pt_nif(nif text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE s int := 0; c int; i int;
BEGIN
  IF nif IS NULL OR nif !~ '^[0-9]{9}$' THEN RETURN false; END IF;
  FOR i IN 1..8 LOOP s := s + substr(nif, i, 1)::int * (10 - i); END LOOP;
  c := 11 - (s % 11); IF c >= 10 THEN c := 0; END IF;
  RETURN c = substr(nif, 9, 1)::int;
END $$;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS seller_legal_name text,
  ADD COLUMN IF NOT EXISTS seller_tax_id text,
  ADD COLUMN IF NOT EXISTS seller_address text,
  ADD COLUMN IF NOT EXISTS delivery_business_days smallint;

ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_seller_legal_name_len CHECK (seller_legal_name IS NULL OR char_length(btrim(seller_legal_name)) BETWEEN 2 AND 200),
  ADD CONSTRAINT store_settings_seller_tax_id_valid CHECK (seller_tax_id IS NULL OR public.is_valid_pt_nif(seller_tax_id)),
  ADD CONSTRAINT store_settings_seller_address_len CHECK (seller_address IS NULL OR char_length(btrim(seller_address)) BETWEEN 5 AND 300),
  ADD CONSTRAINT store_settings_delivery_days_range CHECK (delivery_business_days IS NULL OR delivery_business_days BETWEEN 1 AND 60);

CREATE OR REPLACE VIEW public.public_store_settings WITH (security_invoker = off) AS
SELECT id, workspace_id, store_name, store_description, logo_url, banner_url, primary_color, accent_color,
  footer_text, show_categories, show_search, store_slug, custom_domain, prices_include_vat, vat_rate,
  c2c_enabled, c2c_allow_mixed_cart, payment_methods, bank_transfer_details, facebook_pixel_id,
  product_page_config, created_at, updated_at,
  seller_legal_name, seller_tax_id, seller_address, delivery_business_days
FROM public.store_settings s;