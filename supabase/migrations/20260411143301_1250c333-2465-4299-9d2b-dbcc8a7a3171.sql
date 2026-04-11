ALTER TABLE public.c2c_listings
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 1;