
-- Add new columns to community_events
ALTER TABLE public.community_events 
  ADD COLUMN IF NOT EXISTS agenda jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speakers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_url text,
  ADD COLUMN IF NOT EXISTS recurring_rule text;

-- Add checked_in_at to event_rsvps
ALTER TABLE public.event_rsvps 
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Create storage bucket for event covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-covers bucket
CREATE POLICY "Authenticated users can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "Anyone can view event covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers');
