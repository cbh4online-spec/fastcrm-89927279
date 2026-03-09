
CREATE TABLE public.event_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  test_name text NOT NULL,
  test_type text NOT NULL,
  input_payload jsonb NOT NULL DEFAULT '{}',
  expected_signal text,
  expected_decision text,
  expected_action text,
  expected_result text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read event_test_cases"
  ON public.event_test_cases FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert event_test_cases"
  ON public.event_test_cases FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update event_test_cases"
  ON public.event_test_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
