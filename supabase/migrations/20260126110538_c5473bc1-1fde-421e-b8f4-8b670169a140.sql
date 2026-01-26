-- Add is_enabled column to proposal_items table
ALTER TABLE proposal_items 
ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;