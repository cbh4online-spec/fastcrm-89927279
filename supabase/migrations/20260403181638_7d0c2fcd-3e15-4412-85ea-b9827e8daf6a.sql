-- Create geofence zones table
CREATE TABLE public.hr_geofence_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for workspace lookups
CREATE INDEX idx_hr_geofence_zones_workspace ON public.hr_geofence_zones(workspace_id);

-- Enable RLS
ALTER TABLE public.hr_geofence_zones ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped by workspace_members
CREATE POLICY "Members can view geofence zones"
ON public.hr_geofence_zones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = hr_geofence_zones.workspace_id
    AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can create geofence zones"
ON public.hr_geofence_zones FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = hr_geofence_zones.workspace_id
    AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can update geofence zones"
ON public.hr_geofence_zones FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = hr_geofence_zones.workspace_id
    AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can delete geofence zones"
ON public.hr_geofence_zones FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = hr_geofence_zones.workspace_id
    AND wm.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_hr_geofence_zones_updated_at
BEFORE UPDATE ON public.hr_geofence_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();