
-- Table for workspace Twilio configuration
CREATE TABLE public.twilio_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  twilio_phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

-- Enable RLS
ALTER TABLE public.twilio_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace members can view
CREATE POLICY "Members can view twilio connections"
  ON public.twilio_connections FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = twilio_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- INSERT: admins/owners only
CREATE POLICY "Admins can create twilio connections"
  ON public.twilio_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = twilio_connections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

-- UPDATE: admins/owners only
CREATE POLICY "Admins can update twilio connections"
  ON public.twilio_connections FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = twilio_connections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

-- DELETE: admins/owners only
CREATE POLICY "Admins can delete twilio connections"
  ON public.twilio_connections FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = twilio_connections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_twilio_connections_updated_at
  BEFORE UPDATE ON public.twilio_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
