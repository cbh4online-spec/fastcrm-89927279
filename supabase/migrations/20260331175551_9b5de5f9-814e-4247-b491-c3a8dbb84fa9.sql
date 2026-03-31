
CREATE TABLE public.hr_attendance_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  anomaly_date date NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  description text,
  session_id uuid REFERENCES public.hr_work_sessions(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.hr_schedules(id) ON DELETE SET NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, anomaly_date, anomaly_type)
);

CREATE INDEX idx_hr_attendance_anomalies_workspace ON public.hr_attendance_anomalies(workspace_id);
CREATE INDEX idx_hr_attendance_anomalies_employee ON public.hr_attendance_anomalies(employee_id);
CREATE INDEX idx_hr_attendance_anomalies_pending ON public.hr_attendance_anomalies(workspace_id, resolved) WHERE resolved = false;

ALTER TABLE public.hr_attendance_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view anomalies"
  ON public.hr_attendance_anomalies FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members can update anomalies"
  ON public.hr_attendance_anomalies FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service can insert anomalies"
  ON public.hr_attendance_anomalies FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
