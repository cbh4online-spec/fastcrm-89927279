-- Add external_instance_id column for future Evolution API ID tracking
ALTER TABLE public.whatsapp_qr_connections
  ADD COLUMN IF NOT EXISTS external_instance_id text;

-- Add index on instance_name for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_qr_connections_instance_name
  ON public.whatsapp_qr_connections (instance_name);