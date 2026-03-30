
-- store_recovery_settings table
CREATE TABLE public.store_recovery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  default_sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  auto_enroll_enabled BOOLEAN NOT NULL DEFAULT false,
  min_cart_value NUMERIC(12,2) DEFAULT 0,
  require_email BOOLEAN NOT NULL DEFAULT true,
  require_phone BOOLEAN NOT NULL DEFAULT false,
  abandonment_delay_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.store_recovery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recovery settings"
  ON public.store_recovery_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage recovery settings"
  ON public.store_recovery_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Add outreach fields to store_abandoned_carts
ALTER TABLE public.store_abandoned_carts
  ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_enrollment_id UUID REFERENCES public.email_sequence_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS outreach_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outreach_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT;

-- Indices
CREATE INDEX IF NOT EXISTS idx_store_abandoned_carts_outreach_status ON public.store_abandoned_carts(outreach_status);
CREATE INDEX IF NOT EXISTS idx_store_abandoned_carts_sequence_enrollment ON public.store_abandoned_carts(sequence_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_store_recovery_settings_workspace ON public.store_recovery_settings(workspace_id);
