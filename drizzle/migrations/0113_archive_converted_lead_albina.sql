-- Lead "Albina Ramalho Garcia" (PHARLISS) was converted to a contact but stayed in the active leads list.
UPDATE public.leads
SET archived_at = now(), status = 'completed'
WHERE id = '307ef005-8626-4050-a172-095bb67d2318'
  AND archived_at IS NULL;
