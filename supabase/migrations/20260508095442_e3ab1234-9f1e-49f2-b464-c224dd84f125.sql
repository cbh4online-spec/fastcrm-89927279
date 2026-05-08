-- LeadChef Fase 6: tabela de extensão para perfis de cliente
CREATE TABLE IF NOT EXISTS public.leadchef_client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  contact_id uuid,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new_customer',
  post_sale_status text,
  next_follow_up_at timestamptz,
  potential_referral boolean NOT NULL DEFAULT false,
  potential_recruitment boolean NOT NULL DEFAULT false,
  customer_cycle jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_client_profiles_status_chk CHECK (status IN (
    'new_customer','onboarding_pending','post_sale_pending','active',
    'potential_referral','potential_recruitment','inactive','reactivate_later'
  )),
  CONSTRAINT leadchef_client_profiles_unique_lead UNIQUE (workspace_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_leadchef_client_profiles_ws_status ON public.leadchef_client_profiles (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leadchef_client_profiles_ws_lead ON public.leadchef_client_profiles (workspace_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_leadchef_client_profiles_followup ON public.leadchef_client_profiles (workspace_id, next_follow_up_at);

ALTER TABLE public.leadchef_client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_client_profiles_ws_select" ON public.leadchef_client_profiles
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_client_profiles_ws_insert" ON public.leadchef_client_profiles
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_client_profiles_ws_update" ON public.leadchef_client_profiles
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_client_profiles_ws_delete" ON public.leadchef_client_profiles
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_leadchef_client_profiles_updated_at
  BEFORE UPDATE ON public.leadchef_client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();