REVOKE ALL ON FUNCTION public.prospecting_identity_check_batch(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prospecting_identity_check(uuid,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospecting_identity_check_batch(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prospecting_import_lead_safe(uuid,jsonb,jsonb,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prospecting_identity_check(uuid,jsonb,uuid) TO authenticated;