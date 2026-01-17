-- Remove a constraint antiga
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Adiciona a nova constraint com todos os tipos
ALTER TABLE products ADD CONSTRAINT products_product_type_check 
CHECK (product_type = ANY (ARRAY[
  'simple', 
  'recurring', 
  'sessions', 
  'composite', 
  'formacao', 
  'programa', 
  'physical'
]));