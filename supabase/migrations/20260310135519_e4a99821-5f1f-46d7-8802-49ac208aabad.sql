ALTER TABLE public.c2c_listings 
ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'shipping' 
CHECK (delivery_mode IN ('shipping', 'in_person', 'both'));