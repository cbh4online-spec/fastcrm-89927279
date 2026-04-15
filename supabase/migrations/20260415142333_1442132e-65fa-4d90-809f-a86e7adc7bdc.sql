-- Add featured_product_id to c2c_livestreams
ALTER TABLE public.c2c_livestreams
  ADD COLUMN IF NOT EXISTS featured_product_id uuid DEFAULT NULL;

-- Add livekit_room_name to c2c_livestreams
ALTER TABLE public.c2c_livestreams
  ADD COLUMN IF NOT EXISTS livekit_room_name text DEFAULT NULL;