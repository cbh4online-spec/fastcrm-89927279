-- Change default for is_approved to false (require moderation)
ALTER TABLE public.store_reviews ALTER COLUMN is_approved SET DEFAULT false;

-- Add moderation fields
ALTER TABLE public.store_reviews 
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;