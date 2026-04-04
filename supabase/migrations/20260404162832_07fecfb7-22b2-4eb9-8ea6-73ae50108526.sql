
-- Add payment methods config to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '{"stripe_card": true, "mbway": false, "multibanco": false, "bank_transfer": false}'::jsonb;

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS bank_transfer_details jsonb DEFAULT NULL;

-- Add payment method used to store_orders
ALTER TABLE public.store_orders
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe_card';
