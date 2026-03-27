ALTER TABLE public.booking_pages 
ADD COLUMN IF NOT EXISTS host_user_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.booking_pages.host_user_ids IS 'Array of user IDs whose calendars should be cross-checked for availability. Empty = use calendar_id only.';