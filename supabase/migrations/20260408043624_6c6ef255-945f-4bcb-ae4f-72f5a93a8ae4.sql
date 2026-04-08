-- Enable pg_net extension (pg_cron is already available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;