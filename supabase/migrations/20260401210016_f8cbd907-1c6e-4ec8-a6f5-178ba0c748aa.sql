
-- Add recovery columns to whatsapp_qr_connections
ALTER TABLE public.whatsapp_qr_connections
  ADD COLUMN IF NOT EXISTS recovery_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recovery_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reconnect_at timestamptz;

-- Add validation trigger for recovery_state values
CREATE OR REPLACE FUNCTION public.validate_whatsapp_recovery_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recovery_state NOT IN ('none', 'checking', 'resyncing', 'reconnecting', 'repair_required', 'repaired', 'failed') THEN
    RAISE EXCEPTION 'Invalid recovery_state: %', NEW.recovery_state;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_whatsapp_recovery_state ON public.whatsapp_qr_connections;

CREATE TRIGGER trg_validate_whatsapp_recovery_state
  BEFORE INSERT OR UPDATE ON public.whatsapp_qr_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_whatsapp_recovery_state();
