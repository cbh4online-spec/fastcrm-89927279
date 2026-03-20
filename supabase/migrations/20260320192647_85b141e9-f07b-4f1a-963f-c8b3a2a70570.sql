
ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent
  ON product_categories (parent_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;
