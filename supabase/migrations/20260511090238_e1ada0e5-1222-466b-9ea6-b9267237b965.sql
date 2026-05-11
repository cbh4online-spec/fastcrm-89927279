
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS order_tracking_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_tracking_template text NOT NULL DEFAULT
    'Olá {{customer_name}}! 📦 A sua encomenda #{{order_number}} foi expedida{{carrier_clause}}. Acompanhe aqui: {{tracking_url}}';

CREATE OR REPLACE FUNCTION public.notify_whatsapp_tracking_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled boolean;
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.tracking_number,'') = COALESCE(NEW.tracking_number,'') THEN
    RETURN NEW;
  END IF;

  SELECT order_tracking_enabled INTO enabled
    FROM public.whatsapp_settings
    WHERE workspace_id = NEW.workspace_id
    LIMIT 1;
  IF COALESCE(enabled, true) = false THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/whatsapp-send-tracking',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8"}'::jsonb,
    body := jsonb_build_object('order_id', NEW.id, 'workspace_id', NEW.workspace_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_whatsapp_tracking ON public.store_orders;
CREATE TRIGGER trg_notify_whatsapp_tracking
  AFTER INSERT OR UPDATE OF tracking_number ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_whatsapp_tracking_added();
