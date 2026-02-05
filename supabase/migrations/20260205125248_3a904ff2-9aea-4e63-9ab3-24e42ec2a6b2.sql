-- Add b2b_published column to products table
ALTER TABLE products 
ADD COLUMN b2b_published boolean DEFAULT true;

COMMENT ON COLUMN products.b2b_published IS 'Whether this product is visible in the B2B client portal';