-- Add specifications column to products table for technical data sheet
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';