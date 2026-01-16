-- =====================================================
-- SSO + CONTEXT BRIDGE INFRASTRUCTURE
-- =====================================================

-- Create enum for SSO token status
CREATE TYPE public.sso_token_status AS ENUM ('pending', 'active', 'used', 'expired', 'revoked');

-- Create enum for integration mode
CREATE TYPE public.integration_mode AS ENUM ('embed', 'redirect', 'headless');

-- =====================================================
-- MODULE SSO SESSIONS
-- Track active SSO sessions between CRM and apps
-- =====================================================
CREATE TABLE public.module_sso_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Session info
  session_token TEXT NOT NULL UNIQUE,
  integration_mode integration_mode NOT NULL DEFAULT 'embed',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Context snapshot (stored at session creation)
  context_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Granted scopes for this session
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  user_agent TEXT,
  ip_address INET
);

-- Index for fast lookups
CREATE INDEX idx_module_sso_sessions_workspace ON public.module_sso_sessions(workspace_id);
CREATE INDEX idx_module_sso_sessions_user ON public.module_sso_sessions(user_id);
CREATE INDEX idx_module_sso_sessions_module ON public.module_sso_sessions(module_id);
CREATE INDEX idx_module_sso_sessions_token ON public.module_sso_sessions(session_token);
CREATE INDEX idx_module_sso_sessions_active ON public.module_sso_sessions(is_active, expires_at);

-- Enable RLS
ALTER TABLE public.module_sso_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own SSO sessions"
  ON public.module_sso_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Workspace admins can view all workspace sessions"
  ON public.module_sso_sessions FOR SELECT
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "System can insert SSO sessions"
  ON public.module_sso_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions"
  ON public.module_sso_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- MODULE SSO TOKENS (Short-lived, single-use)
-- =====================================================
CREATE TABLE public.module_sso_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.module_sso_sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Token data
  token TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  
  -- Status
  status sso_token_status NOT NULL DEFAULT 'pending',
  
  -- Security
  nonce TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT
);

-- Index for fast lookups
CREATE INDEX idx_module_sso_tokens_token_hash ON public.module_sso_tokens(token_hash);
CREATE INDEX idx_module_sso_tokens_session ON public.module_sso_tokens(session_id);
CREATE INDEX idx_module_sso_tokens_status ON public.module_sso_tokens(status, expires_at);

-- Enable RLS
ALTER TABLE public.module_sso_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tokens should not be directly accessible from frontend)
CREATE POLICY "No direct access to tokens"
  ON public.module_sso_tokens FOR SELECT
  USING (false);

-- =====================================================
-- MODULE ACCESS LOGS (Audit trail)
-- =====================================================
CREATE TABLE public.module_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  module_id TEXT NOT NULL,
  session_id UUID REFERENCES public.module_sso_sessions(id) ON DELETE SET NULL,
  
  -- Action info
  action_type TEXT NOT NULL, -- 'sso_initiated', 'token_generated', 'token_validated', 'context_fetched', 'action_executed', 'session_revoked', 'access_denied'
  action_details JSONB DEFAULT '{}',
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  error_code TEXT,
  
  -- Request info
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups and reporting
CREATE INDEX idx_module_access_logs_workspace ON public.module_access_logs(workspace_id);
CREATE INDEX idx_module_access_logs_user ON public.module_access_logs(user_id);
CREATE INDEX idx_module_access_logs_module ON public.module_access_logs(module_id);
CREATE INDEX idx_module_access_logs_action ON public.module_access_logs(action_type);
CREATE INDEX idx_module_access_logs_created ON public.module_access_logs(created_at DESC);
CREATE INDEX idx_module_access_logs_success ON public.module_access_logs(success, created_at DESC);

-- Enable RLS
ALTER TABLE public.module_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace admins can view access logs"
  ON public.module_access_logs FOR SELECT
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "System can insert access logs"
  ON public.module_access_logs FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired tokens and sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired tokens
  UPDATE public.module_sso_tokens
  SET status = 'expired'
  WHERE status IN ('pending', 'active')
    AND expires_at < now();
  
  -- Deactivate expired sessions
  UPDATE public.module_sso_sessions
  SET is_active = false
  WHERE is_active = true
    AND expires_at < now();
END;
$$;

-- Function to revoke all sessions for a module in a workspace
CREATE OR REPLACE FUNCTION public.revoke_module_sessions(
  p_workspace_id UUID,
  p_module_id TEXT,
  p_revoked_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.module_sso_sessions
  SET 
    is_active = false,
    revoked_at = now(),
    revoked_by = COALESCE(p_revoked_by, auth.uid())
  WHERE workspace_id = p_workspace_id
    AND module_id = p_module_id
    AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log the action
  INSERT INTO public.module_access_logs (
    workspace_id, user_id, module_id, action_type, action_details, success
  ) VALUES (
    p_workspace_id,
    COALESCE(p_revoked_by, auth.uid()),
    p_module_id,
    'session_revoked',
    jsonb_build_object('sessions_revoked', v_count, 'reason', 'manual_revocation'),
    true
  );
  
  RETURN v_count;
END;
$$;

-- Function to check if a module is accessible
CREATE OR REPLACE FUNCTION public.check_module_access(
  p_workspace_id UUID,
  p_module_id TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_module RECORD;
  v_user_role workspace_role;
  v_result JSONB;
BEGIN
  -- Check if user is workspace member
  SELECT role INTO v_user_role
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'not_workspace_member'
    );
  END IF;
  
  -- Check if module is installed and active
  SELECT * INTO v_workspace_module
  FROM public.workspace_modules
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  IF v_workspace_module IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'module_not_installed'
    );
  END IF;
  
  IF v_workspace_module.status NOT IN ('active', 'trial') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'module_not_active',
      'status', v_workspace_module.status
    );
  END IF;
  
  -- Check trial expiration if applicable
  IF v_workspace_module.status = 'trial' AND v_workspace_module.trial_ends_at < now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'trial_expired'
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'user_role', v_user_role,
    'module_status', v_workspace_module.status,
    'settings', v_workspace_module.settings
  );
END;
$$;

-- Enable realtime for sessions (for instant revocation)
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_sso_sessions;