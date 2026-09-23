-- Esquema mínimo que imita as tabelas existentes em produção (apenas colunas usadas).
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
CREATE TABLE public.workspaces (id uuid PRIMARY KEY);
CREATE FUNCTION public.is_workspace_member(u uuid, w uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION public.is_super_admin(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE public.email_connections (id uuid PRIMARY KEY, workspace_id uuid);
CREATE TABLE public.leads (id uuid PRIMARY KEY, workspace_id uuid, email text, phone text);
CREATE TABLE public.contacts (id uuid PRIMARY KEY, workspace_id uuid, email text, phone text);
CREATE TABLE public.conversations (id uuid PRIMARY KEY, workspace_id uuid, channel text, external_thread_id text, lead_id uuid, contact_id uuid);
CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid, workspace_id uuid, direction text, created_at timestamptz DEFAULT now());
CREATE TABLE public.sdr_campaigns (id uuid PRIMARY KEY, workspace_id uuid REFERENCES public.workspaces(id), settings jsonb);
CREATE TABLE public.sdr_suppressions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, email text, reason text, source_enrollment_id uuid);
CREATE UNIQUE INDEX idx_sdr_suppressions_workspace_email ON public.sdr_suppressions (workspace_id, lower(email));
CREATE TABLE public.sdr_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid REFERENCES public.sdr_campaigns(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE, prospect_id uuid, lead_id uuid, contact_id uuid,
  prospect_name text, prospect_email text, prospect_phone text, status text DEFAULT 'enrolled', reply_detected_at timestamptz,
  opted_out_at timestamptz, metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  current_step integer DEFAULT 0, next_send_at timestamptz,
  CONSTRAINT sdr_enrollments_status_check CHECK (status = ANY (ARRAY['enrolled','enriching','sequenced','replied','positive_reply','meeting_set','converted','opted_out','failed'])));

INSERT INTO public.workspaces VALUES ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
INSERT INTO public.sdr_campaigns VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', '{}'),
                                        ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000b', '{}');
-- Duplicados preexistentes (mesmo email com capitalização diferente) — não podem fazer falhar a migração.
INSERT INTO public.sdr_enrollments (id, campaign_id, workspace_id, prospect_email, status, created_at) VALUES
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000000a','ana@x.pt','sequenced', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000000a','ANA@x.pt ','enrolled', now() - interval '1 day'),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000000b','ana@x.pt','sequenced', now() - interval '1 day');
