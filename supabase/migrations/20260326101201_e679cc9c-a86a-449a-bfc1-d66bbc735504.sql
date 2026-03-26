ALTER TABLE public.whatsapp_connections 
ADD COLUMN IF NOT EXISTS connection_type text DEFAULT 'cloud_api';

CREATE OR REPLACE FUNCTION validate_connection_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.connection_type NOT IN ('cloud_api', 'evolution') THEN
    RAISE EXCEPTION 'connection_type must be cloud_api or evolution';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_connection_type ON public.whatsapp_connections;
CREATE TRIGGER trg_validate_connection_type
  BEFORE INSERT OR UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION validate_connection_type();

ALTER TABLE public.whatsapp_connections 
ADD COLUMN IF NOT EXISTS evolution_instance_name text,
ADD COLUMN IF NOT EXISTS evolution_instance_id text;