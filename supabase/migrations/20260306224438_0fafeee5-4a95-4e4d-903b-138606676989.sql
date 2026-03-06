
-- kernel_events: add processing state columns
ALTER TABLE public.kernel_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- kernel_entities: normalize with owner, status, score, last_activity_at
ALTER TABLE public.kernel_entities
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS score FLOAT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- kernel_actions_registry: complete action catalog
ALTER TABLE public.kernel_actions_registry
  ADD COLUMN IF NOT EXISTS permission_scope TEXT DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS ui_label TEXT,
  ADD COLUMN IF NOT EXISTS side_effect_events TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS input_validation JSONB DEFAULT '{}';
