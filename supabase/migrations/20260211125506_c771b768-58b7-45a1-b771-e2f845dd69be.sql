
ALTER TABLE store_visitor_sessions 
  ADD COLUMN IF NOT EXISTS cart_items jsonb,
  ADD COLUMN IF NOT EXISTS cart_subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS cart_processed boolean DEFAULT false;
