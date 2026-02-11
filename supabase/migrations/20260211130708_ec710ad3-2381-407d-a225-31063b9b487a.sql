ALTER TABLE store_settings
  ADD COLUMN prices_include_vat boolean NOT NULL DEFAULT true,
  ADD COLUMN vat_rate numeric NOT NULL DEFAULT 23;