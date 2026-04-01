ALTER TABLE public.whatsapp_qr_connections
  DROP CONSTRAINT IF EXISTS whatsapp_qr_connections_status_check;

ALTER TABLE public.whatsapp_qr_connections
  ADD CONSTRAINT whatsapp_qr_connections_status_check CHECK (
    status::text = ANY(ARRAY['not_configured','creating_instance','qr_pending','waiting_for_scan','authenticating','connected','disconnected','qr_expired','reconnecting','error'])
  );