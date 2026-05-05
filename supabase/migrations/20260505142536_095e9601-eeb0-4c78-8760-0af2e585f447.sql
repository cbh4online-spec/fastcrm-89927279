-- Phase 7: Deprecate Evolution/QR WhatsApp infrastructure
-- Drop the legacy whatsapp_qr_connections table now that all code references have been migrated to whatsapp_zapi_connections.
DROP TABLE IF EXISTS public.whatsapp_qr_connections CASCADE;