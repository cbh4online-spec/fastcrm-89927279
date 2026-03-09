CREATE TABLE IF NOT EXISTS public.event_decision_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL UNIQUE,
  domain text NOT NULL,
  source_module text NOT NULL,
  entity_type text NOT NULL,
  minimum_payload_json jsonb NOT NULL,
  signal_type text,
  decision_type text,
  action_type text,
  priority text NOT NULL DEFAULT 'medium',
  is_user_visible boolean NOT NULL DEFAULT false,
  auto_execute boolean NOT NULL DEFAULT false,
  target_module text,
  notes text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for priority instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_event_decision_matrix_priority()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.priority NOT IN ('critical','high','medium','low') THEN
    RAISE EXCEPTION 'priority must be one of: critical, high, medium, low';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_edm_priority
  BEFORE INSERT OR UPDATE ON public.event_decision_matrix
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_decision_matrix_priority();

-- Enable RLS
ALTER TABLE public.event_decision_matrix ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read event_decision_matrix"
  ON public.event_decision_matrix FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to manage
CREATE POLICY "Authenticated users can manage event_decision_matrix"
  ON public.event_decision_matrix FOR ALL TO authenticated USING (true) WITH CHECK (true);