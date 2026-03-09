
-- 1. Create event_registry table
CREATE TABLE public.event_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text UNIQUE NOT NULL,
  domain text NOT NULL,
  entity_type text NOT NULL,
  source_module text NOT NULL,
  description text,
  payload_schema_json jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.event_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read event_registry"
  ON public.event_registry FOR SELECT TO authenticated
  USING (true);

-- 2. ALTER kernel_events: add missing envelope fields
ALTER TABLE public.kernel_events
  ADD COLUMN IF NOT EXISTS causation_id text,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_name text;

-- Index for event_name lookups
CREATE INDEX IF NOT EXISTS idx_kernel_events_event_name ON public.kernel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_event_registry_domain ON public.event_registry(domain);
CREATE INDEX IF NOT EXISTS idx_event_registry_active ON public.event_registry(is_active);
