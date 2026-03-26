
-- Add customization columns to booking_pages
ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS working_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS start_hour text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS end_hour text NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS availability_id uuid REFERENCES public.user_availability(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS require_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_message_label text;

-- Create booking_leads table
CREATE TABLE public.booking_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id uuid NOT NULL REFERENCES public.booking_pages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  guest_message text,
  status text NOT NULL DEFAULT 'partial',
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create booking leads" ON public.booking_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Workspace members can read leads" ON public.booking_leads
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can update leads" ON public.booking_leads
  FOR UPDATE USING (true) WITH CHECK (true);
