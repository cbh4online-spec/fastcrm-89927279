REVOKE EXECUTE ON FUNCTION public.refund_funnel_credits(uuid, uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_funnel_credits(uuid, uuid, text, text, text, text, text, jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_workspace_stripe_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_stripe_config(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.retrieve_entity_memories(uuid, uuid, text, vector, int4, numeric, bool) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retrieve_entity_memories(uuid, uuid, text, vector, int4, numeric, bool) TO service_role;