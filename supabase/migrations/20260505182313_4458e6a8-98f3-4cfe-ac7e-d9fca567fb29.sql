-- Estender autopilot_config
ALTER TABLE public.autopilot_config
  ADD COLUMN IF NOT EXISTS after_hours_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_on_buying_intent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_intent_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS handoff_intents TEXT[] NOT NULL DEFAULT ARRAY['sales']::text[],
  ADD COLUMN IF NOT EXISTS handoff_notification_message TEXT,
  ADD COLUMN IF NOT EXISTS handoff_assign_to_user_id UUID;

-- Constraint do threshold
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'autopilot_config_threshold_range'
  ) THEN
    ALTER TABLE public.autopilot_config
      ADD CONSTRAINT autopilot_config_threshold_range
      CHECK (handoff_intent_threshold >= 0 AND handoff_intent_threshold <= 1);
  END IF;
END $$;

-- Estender conversations para handoff
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS requires_human BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_reason TEXT,
  ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_requires_human
  ON public.conversations (workspace_id, requires_human)
  WHERE requires_human = true;