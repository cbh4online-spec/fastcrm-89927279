
CREATE TABLE public.booking_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 30,
  buffer_minutes integer NOT NULL DEFAULT 0,
  max_advance_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  brand_color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_pages_slug_unique UNIQUE (slug)
);

ALTER TABLE public.booking_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active booking pages"
  ON public.booking_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Workspace members can manage booking pages"
  ON public.booking_pages FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );
