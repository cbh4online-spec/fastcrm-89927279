-- Add sync health columns to whatsapp_qr_connections
ALTER TABLE public.whatsapp_qr_connections
  ADD COLUMN IF NOT EXISTS sync_health text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_successful_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_issue_reason text,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inbound_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_message_at timestamptz;

-- Add check constraint for sync_health values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'whatsapp_qr_connections_sync_health_check'
  ) THEN
    ALTER TABLE public.whatsapp_qr_connections
      ADD CONSTRAINT whatsapp_qr_connections_sync_health_check
      CHECK (sync_health IN ('active', 'delayed', 'suspended', 'degraded', 'failed', 'unknown'));
  END IF;
END $$;

-- Index for health queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_qr_connections_sync_health 
  ON public.whatsapp_qr_connections(sync_health);