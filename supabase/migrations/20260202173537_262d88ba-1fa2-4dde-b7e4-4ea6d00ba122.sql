-- Remove hardcoded check constraints to allow dynamic product types and billing types from configuration tables
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_billing_type_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Add a comment explaining the change
COMMENT ON COLUMN products.product_type IS 'Product type code - values managed dynamically in product_types table';
COMMENT ON COLUMN products.billing_type IS 'Billing type code - values managed dynamically in billing_types table';