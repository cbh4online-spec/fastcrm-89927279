ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS color text DEFAULT null;