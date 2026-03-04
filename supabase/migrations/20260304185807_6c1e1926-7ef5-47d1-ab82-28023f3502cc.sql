
-- Add origin tracking to context_fields
ALTER TABLE public.context_fields 
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origin_details JSONB;

-- origin values: 'manual', 'ai', 'imported', 'brief'
-- origin_details: { model, timestamp, confidence, source }
