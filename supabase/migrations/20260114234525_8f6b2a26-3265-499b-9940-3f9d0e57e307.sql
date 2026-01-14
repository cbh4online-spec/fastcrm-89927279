-- Create table for email connections
CREATE TABLE public.email_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connected_by UUID NOT NULL,
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider TEXT NOT NULL, -- 'gmail', 'outlook', 'custom'
  auth_type TEXT NOT NULL, -- 'oauth', 'app_password'
  
  -- OAuth tokens (encrypted in edge function before storage)
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  
  -- App password (encrypted in edge function before storage)
  encrypted_app_password TEXT,
  
  -- IMAP settings
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_use_ssl BOOLEAN DEFAULT true,
  
  -- SMTP settings
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_use_tls BOOLEAN DEFAULT true,
  
  -- Sync state
  last_sync_at TIMESTAMPTZ,
  last_sync_uid TEXT,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'synced', 'error'
  sync_error TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, email_address)
);

-- Create index for workspace queries
CREATE INDEX idx_email_connections_workspace ON public.email_connections(workspace_id);
CREATE INDEX idx_email_connections_active ON public.email_connections(workspace_id, is_active);

-- Enable RLS
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view email connections in their workspace"
ON public.email_connections FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage email connections"
ON public.email_connections FOR ALL
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Add email metadata to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS email_message_id TEXT,
ADD COLUMN IF NOT EXISTS email_in_reply_to TEXT,
ADD COLUMN IF NOT EXISTS email_references TEXT[],
ADD COLUMN IF NOT EXISTS email_subject TEXT;

-- Create index for email threading
CREATE INDEX idx_messages_email_message_id ON public.messages(email_message_id) WHERE email_message_id IS NOT NULL;

-- Update trigger for updated_at
CREATE TRIGGER update_email_connections_updated_at
BEFORE UPDATE ON public.email_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();