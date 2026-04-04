-- Add scroll depth, exit page and pages history to store_visitor_sessions
ALTER TABLE public.store_visitor_sessions
  ADD COLUMN IF NOT EXISTS scroll_depth_max smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exit_page text,
  ADD COLUMN IF NOT EXISTS pages_history text[] DEFAULT '{}';