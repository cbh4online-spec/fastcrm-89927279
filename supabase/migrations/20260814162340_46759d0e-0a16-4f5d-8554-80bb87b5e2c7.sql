-- 1) Remover canais WhatsApp cujo ghl_account_id é uma location NÃO configurada no workspace
DELETE FROM public.workspace_ghl_social_channels c
WHERE c.channel_type = 'whatsapp'
  AND EXISTS (
    SELECT 1 FROM public.workspace_ghl_config g
    WHERE g.ghl_location_id = c.ghl_account_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_ghl_config g2
    WHERE g2.workspace_id = c.workspace_id
      AND g2.ghl_location_id = c.ghl_account_id
  );

-- 2) Impedir novas gravações cruzadas
CREATE OR REPLACE FUNCTION public.validate_ghl_social_channel_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel_type = 'whatsapp'
     AND EXISTS (SELECT 1 FROM public.workspace_ghl_config g WHERE g.ghl_location_id = NEW.ghl_account_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.workspace_ghl_config g2
       WHERE g2.workspace_id = NEW.workspace_id
         AND g2.ghl_location_id = NEW.ghl_account_id
     )
  THEN
    RAISE EXCEPTION 'GHL location % não pertence ao workspace %', NEW.ghl_account_id, NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ghl_social_channel_location ON public.workspace_ghl_social_channels;
CREATE TRIGGER trg_validate_ghl_social_channel_location
BEFORE INSERT OR UPDATE ON public.workspace_ghl_social_channels
FOR EACH ROW EXECUTE FUNCTION public.validate_ghl_social_channel_location();