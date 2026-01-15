-- Add missing column racius_url to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS racius_url text;