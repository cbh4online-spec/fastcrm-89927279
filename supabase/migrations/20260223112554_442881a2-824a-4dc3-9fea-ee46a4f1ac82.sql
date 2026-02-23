
-- Add MQPC tracking fields to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_quick_created boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_channel text DEFAULT 'desktop';
