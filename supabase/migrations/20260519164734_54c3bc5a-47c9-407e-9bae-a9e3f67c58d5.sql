-- 1) Migrar workspaces em modo leadchef para fastcrm
UPDATE public.workspaces SET ui_mode = 'fastcrm' WHERE ui_mode = 'leadchef';

-- 2) Drop de todas as tabelas leadchef_* (CASCADE remove FKs, policies, triggers)
DROP TABLE IF EXISTS public.leadchef_ai_suggestions CASCADE;
DROP TABLE IF EXISTS public.leadchef_app_config CASCADE;
DROP TABLE IF EXISTS public.leadchef_appointments CASCADE;
DROP TABLE IF EXISTS public.leadchef_audit_logs CASCADE;
DROP TABLE IF EXISTS public.leadchef_automation_rules CASCADE;
DROP TABLE IF EXISTS public.leadchef_client_profiles CASCADE;
DROP TABLE IF EXISTS public.leadchef_customer_experiences CASCADE;
DROP TABLE IF EXISTS public.leadchef_goals CASCADE;
DROP TABLE IF EXISTS public.leadchef_landing_content CASCADE;
DROP TABLE IF EXISTS public.leadchef_lead_profiles CASCADE;
DROP TABLE IF EXISTS public.leadchef_lead_scores CASCADE;
DROP TABLE IF EXISTS public.leadchef_lead_sequence_runs CASCADE;
DROP TABLE IF EXISTS public.leadchef_message_templates CASCADE;
DROP TABLE IF EXISTS public.leadchef_notification_prefs CASCADE;
DROP TABLE IF EXISTS public.leadchef_products CASCADE;
DROP TABLE IF EXISTS public.leadchef_push_queue CASCADE;
DROP TABLE IF EXISTS public.leadchef_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.leadchef_referrals CASCADE;
DROP TABLE IF EXISTS public.leadchef_scheduled_messages CASCADE;
DROP TABLE IF EXISTS public.leadchef_sequence_run_logs CASCADE;
DROP TABLE IF EXISTS public.leadchef_sequence_steps CASCADE;
DROP TABLE IF EXISTS public.leadchef_sequences CASCADE;

-- 3) Drop de eventuais funções residuais com prefixo leadchef_
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'leadchef\_%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE;', r.nspname, r.proname, r.args);
  END LOOP;
END $$;