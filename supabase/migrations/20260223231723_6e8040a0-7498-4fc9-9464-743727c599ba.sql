
ALTER TABLE products ADD COLUMN IF NOT EXISTS line TEXT;
CREATE INDEX IF NOT EXISTS idx_products_line ON products(line) WHERE line IS NOT NULL;
