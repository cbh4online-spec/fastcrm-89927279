-- Add brand color columns to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#8b5cf6';