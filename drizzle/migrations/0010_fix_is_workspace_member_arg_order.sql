-- 1) Tornar is_workspace_member tolerante à ordem dos argumentos.
--    Várias políticas foram criadas como is_workspace_member(workspace_id, auth.uid()),
--    invertendo (_user_id, _workspace_id) e bloqueando todos os utilizadores.
--    A verificação continua a exigir uma linha real em workspace_members para o par,
--    pelo que não alarga permissões.
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.is_super_admin(_workspace_id)
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members m
        WHERE (m.user_id = _user_id AND m.workspace_id = _workspace_id)
           OR (m.user_id = _workspace_id AND m.workspace_id = _user_id)
      )
$$;

-- 2) Corrigir explicitamente as políticas do módulo de contacto validado (outreach_*)
DROP POLICY IF EXISTS outreach_validations_members ON public.outreach_validations;
CREATE POLICY outreach_validations_members ON public.outreach_validations
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_settings_members ON public.outreach_settings;
CREATE POLICY outreach_settings_members ON public.outreach_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_drafts_members ON public.outreach_drafts;
CREATE POLICY outreach_drafts_members ON public.outreach_drafts
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_suppressions_members ON public.outreach_suppressions;
CREATE POLICY outreach_suppressions_members ON public.outreach_suppressions
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_events_select ON public.outreach_events;
CREATE POLICY outreach_events_select ON public.outreach_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_events_insert ON public.outreach_events;
CREATE POLICY outreach_events_insert ON public.outreach_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS outreach_channel_links_select ON public.outreach_channel_links;
CREATE POLICY outreach_channel_links_select ON public.outreach_channel_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_channel_links_write ON public.outreach_channel_links;
CREATE POLICY outreach_channel_links_write ON public.outreach_channel_links
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS outreach_send_attempts_select ON public.outreach_send_attempts;
CREATE POLICY outreach_send_attempts_select ON public.outreach_send_attempts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 3) Consentimentos WhatsApp
DROP POLICY IF EXISTS "Members can view workspace whatsapp consents" ON public.whatsapp_consents;
CREATE POLICY "Members can view workspace whatsapp consents" ON public.whatsapp_consents
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can insert workspace whatsapp consents" ON public.whatsapp_consents;
CREATE POLICY "Members can insert workspace whatsapp consents" ON public.whatsapp_consents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can update workspace whatsapp consents" ON public.whatsapp_consents;
CREATE POLICY "Members can update workspace whatsapp consents" ON public.whatsapp_consents
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members view workspace consent links" ON public.whatsapp_consent_links;
CREATE POLICY "Members view workspace consent links" ON public.whatsapp_consent_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members insert workspace consent links" ON public.whatsapp_consent_links;
CREATE POLICY "Members insert workspace consent links" ON public.whatsapp_consent_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members update workspace consent links" ON public.whatsapp_consent_links;
CREATE POLICY "Members update workspace consent links" ON public.whatsapp_consent_links
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members view workspace consent import batches" ON public.whatsapp_consent_import_batches;
CREATE POLICY "Members view workspace consent import batches" ON public.whatsapp_consent_import_batches
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members insert workspace consent import batches" ON public.whatsapp_consent_import_batches;
CREATE POLICY "Members insert workspace consent import batches" ON public.whatsapp_consent_import_batches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));