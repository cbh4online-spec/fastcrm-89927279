-- Add demo_video_url column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS demo_video_url TEXT;