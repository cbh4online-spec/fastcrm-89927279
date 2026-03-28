ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS platforms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS contact_person_role text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS min_order_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time_days integer,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';