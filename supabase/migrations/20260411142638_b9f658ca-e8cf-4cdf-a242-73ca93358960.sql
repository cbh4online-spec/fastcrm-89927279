-- Add delivery/shipping fields to c2c_listings
ALTER TABLE public.c2c_listings
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meetup_location text;

-- Add comment for clarity
COMMENT ON COLUMN public.c2c_listings.delivery_mode IS 'shipping, in_person, or both';
COMMENT ON COLUMN public.c2c_listings.shipping_cost IS 'Shipping cost in EUR set by seller';
COMMENT ON COLUMN public.c2c_listings.meetup_location IS 'Location/address for in-person delivery';