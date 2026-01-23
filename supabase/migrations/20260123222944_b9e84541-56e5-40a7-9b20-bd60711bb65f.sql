-- Create workspace stripe configuration table
CREATE TABLE public.workspace_stripe_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  stripe_secret_key_encrypted TEXT,
  stripe_webhook_secret_encrypted TEXT,
  stripe_publishable_key TEXT,
  is_active BOOLEAN DEFAULT false,
  test_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.workspace_stripe_config ENABLE ROW LEVEL SECURITY;

-- Only workspace owners/admins can view/manage stripe config
CREATE POLICY "Workspace owners can view stripe config"
  ON public.workspace_stripe_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_stripe_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace owners can insert stripe config"
  ON public.workspace_stripe_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_stripe_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace owners can update stripe config"
  ON public.workspace_stripe_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_stripe_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_workspace_stripe_config_updated_at
  BEFORE UPDATE ON public.workspace_stripe_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get stripe config for edge functions (using service role)
CREATE OR REPLACE FUNCTION public.get_workspace_stripe_config(p_workspace_id UUID)
RETURNS TABLE (
  stripe_secret_key TEXT,
  stripe_webhook_secret TEXT,
  is_active BOOLEAN,
  test_mode BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wsc.stripe_secret_key_encrypted,
    wsc.stripe_webhook_secret_encrypted,
    wsc.is_active,
    wsc.test_mode
  FROM public.workspace_stripe_config wsc
  WHERE wsc.workspace_id = p_workspace_id;
END;
$$;