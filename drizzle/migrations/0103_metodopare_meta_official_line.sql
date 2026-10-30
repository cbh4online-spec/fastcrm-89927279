UPDATE public.whatsapp_provider_instances SET active = false
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f' AND provider_name <> 'meta_cloud_api';

INSERT INTO public.whatsapp_provider_instances (workspace_id, provider_name, display_name, external_instance_id, default_country, default_country_code, active, environment, metadata)
SELECT 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f', 'meta_cloud_api', 'WhatsApp Business Oficial (+351 925 990 747)', '132077293323682', 'PT', '+351', true, 'production',
  jsonb_build_object('allowed_workspace_id', 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f', 'display_phone_number', '+351 925 990 747', 'waba_id', '147476108440887', 'addon_code', 'addon_whatsapp_official')
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_provider_instances WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f' AND provider_name = 'meta_cloud_api');

INSERT INTO public.whatsapp_official_number_requests (workspace_id, requested_by, phone_number, business_name, status, reviewed_at, review_notes)
SELECT 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f', w.owner_id, '+351925990747', 'METODOPARE', 'active', now(), 'Ativado pela equipa (número principal).'
FROM public.workspaces w WHERE w.id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f' AND w.owner_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.whatsapp_official_number_requests WHERE phone_number = '+351925990747' AND status IN ('pending','approved','active'));