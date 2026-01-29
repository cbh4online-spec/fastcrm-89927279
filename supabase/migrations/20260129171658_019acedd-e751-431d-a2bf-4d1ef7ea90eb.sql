-- Channel Consistency: Identical behavior with format adjustments
-- Ensures AI responds consistently across all channels

-- Channel formatting configuration
CREATE TABLE public.channel_format_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Channel identification
  channel TEXT NOT NULL, -- whatsapp, instagram, facebook, widget, sms, email
  
  -- Response length limits
  max_response_length INTEGER NOT NULL DEFAULT 1000, -- characters
  ideal_response_length INTEGER DEFAULT 500,
  truncation_strategy TEXT DEFAULT 'smart', -- smart, hard, split
  
  -- Message splitting (for long responses)
  enable_message_splitting BOOLEAN DEFAULT true,
  max_messages_per_response INTEGER DEFAULT 3,
  split_delay_ms INTEGER DEFAULT 1500, -- delay between split messages
  
  -- Format adjustments
  use_markdown BOOLEAN DEFAULT false, -- most channels don't support
  use_emojis BOOLEAN DEFAULT true,
  use_line_breaks BOOLEAN DEFAULT true,
  max_line_breaks INTEGER DEFAULT 5,
  
  -- Rich content support
  supports_images BOOLEAN DEFAULT false,
  supports_buttons BOOLEAN DEFAULT false,
  supports_quick_replies BOOLEAN DEFAULT false,
  supports_cards BOOLEAN DEFAULT false,
  supports_links BOOLEAN DEFAULT true,
  link_preview BOOLEAN DEFAULT true,
  
  -- Channel-specific formatting
  greeting_style TEXT DEFAULT 'casual', -- formal, casual, none
  signature_enabled BOOLEAN DEFAULT false,
  signature_text TEXT,
  
  -- Typing indicators
  show_typing_indicator BOOLEAN DEFAULT true,
  typing_duration_per_char_ms INTEGER DEFAULT 50, -- simulate typing speed
  max_typing_duration_ms INTEGER DEFAULT 5000,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, channel)
);

-- Default channel configurations (system-level)
CREATE TABLE public.channel_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL UNIQUE,
  
  -- Default limits
  default_max_length INTEGER NOT NULL,
  default_ideal_length INTEGER NOT NULL,
  
  -- Default capabilities
  default_markdown BOOLEAN DEFAULT false,
  default_emojis BOOLEAN DEFAULT true,
  default_images BOOLEAN DEFAULT false,
  default_buttons BOOLEAN DEFAULT false,
  default_quick_replies BOOLEAN DEFAULT false,
  
  -- Platform constraints
  hard_limit_length INTEGER, -- platform max (e.g., SMS = 160)
  requires_opt_in BOOLEAN DEFAULT false,
  supports_rich_text BOOLEAN DEFAULT false,
  
  -- Metadata
  display_name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default channel configurations
INSERT INTO public.channel_defaults (channel, default_max_length, default_ideal_length, hard_limit_length, default_markdown, default_emojis, default_images, default_buttons, default_quick_replies, supports_rich_text, display_name, icon, description) VALUES
  ('whatsapp', 4096, 500, 4096, false, true, true, true, true, false, 'WhatsApp', 'MessageCircle', 'WhatsApp Business messaging'),
  ('instagram', 1000, 300, 1000, false, true, true, false, true, false, 'Instagram', 'Instagram', 'Instagram Direct Messages'),
  ('facebook', 2000, 500, 2000, false, true, true, true, true, false, 'Facebook', 'Facebook', 'Facebook Messenger'),
  ('widget', 2000, 600, NULL, true, true, true, true, true, true, 'Live Chat', 'MessageSquare', 'Website chat widget'),
  ('sms', 160, 140, 160, false, false, false, false, false, false, 'SMS', 'Smartphone', 'Text messages - 160 char limit'),
  ('email', 10000, 2000, NULL, true, false, true, false, false, true, 'Email', 'Mail', 'Email messaging');

-- Enable RLS
ALTER TABLE public.channel_format_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_defaults ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view channel config"
  ON public.channel_format_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = channel_format_config.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage channel config"
  ON public.channel_format_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = channel_format_config.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = channel_format_config.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Anyone can view channel defaults"
  ON public.channel_defaults FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_channel_format_workspace ON public.channel_format_config(workspace_id, channel);

-- Trigger
CREATE TRIGGER update_channel_format_updated_at
  BEFORE UPDATE ON public.channel_format_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get effective channel config
CREATE OR REPLACE FUNCTION public.get_channel_config(
  p_workspace_id UUID,
  p_channel TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custom channel_format_config%ROWTYPE;
  v_default channel_defaults%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get default
  SELECT * INTO v_default FROM channel_defaults WHERE channel = p_channel;
  
  -- Get custom override
  SELECT * INTO v_custom FROM channel_format_config 
  WHERE workspace_id = p_workspace_id AND channel = p_channel AND is_active = true;
  
  -- Build result with custom overriding defaults
  v_result := jsonb_build_object(
    'channel', p_channel,
    'max_response_length', COALESCE(v_custom.max_response_length, v_default.default_max_length, 1000),
    'ideal_response_length', COALESCE(v_custom.ideal_response_length, v_default.default_ideal_length, 500),
    'hard_limit', v_default.hard_limit_length,
    'truncation_strategy', COALESCE(v_custom.truncation_strategy, 'smart'),
    'enable_message_splitting', COALESCE(v_custom.enable_message_splitting, true),
    'max_messages_per_response', COALESCE(v_custom.max_messages_per_response, 3),
    'use_markdown', COALESCE(v_custom.use_markdown, v_default.default_markdown, false),
    'use_emojis', COALESCE(v_custom.use_emojis, v_default.default_emojis, true),
    'supports_images', COALESCE(v_custom.supports_images, v_default.default_images, false),
    'supports_buttons', COALESCE(v_custom.supports_buttons, v_default.default_buttons, false),
    'supports_quick_replies', COALESCE(v_custom.supports_quick_replies, v_default.default_quick_replies, false),
    'show_typing_indicator', COALESCE(v_custom.show_typing_indicator, true),
    'display_name', v_default.display_name
  );
  
  RETURN v_result;
END;
$$;

-- Function to format response for channel
CREATE OR REPLACE FUNCTION public.format_response_for_channel(
  p_response TEXT,
  p_channel TEXT,
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
  v_max_length INTEGER;
  v_formatted TEXT;
  v_messages TEXT[];
BEGIN
  -- Get config
  v_config := get_channel_config(p_workspace_id, p_channel);
  v_max_length := COALESCE((v_config->>'hard_limit')::INTEGER, (v_config->>'max_response_length')::INTEGER);
  
  -- Remove markdown if not supported
  v_formatted := p_response;
  IF NOT (v_config->>'use_markdown')::BOOLEAN THEN
    v_formatted := regexp_replace(v_formatted, '\*\*([^*]+)\*\*', '\1', 'g'); -- bold
    v_formatted := regexp_replace(v_formatted, '\*([^*]+)\*', '\1', 'g'); -- italic
    v_formatted := regexp_replace(v_formatted, '`([^`]+)`', '\1', 'g'); -- code
  END IF;
  
  -- Handle response length
  IF length(v_formatted) <= v_max_length THEN
    RETURN jsonb_build_object('messages', ARRAY[v_formatted], 'split', false);
  END IF;
  
  -- Split if enabled
  IF (v_config->>'enable_message_splitting')::BOOLEAN THEN
    -- Simple split at sentence boundaries
    v_messages := ARRAY[]::TEXT[];
    WHILE length(v_formatted) > 0 AND array_length(v_messages, 1) < (v_config->>'max_messages_per_response')::INTEGER LOOP
      IF length(v_formatted) <= v_max_length THEN
        v_messages := array_append(v_messages, v_formatted);
        v_formatted := '';
      ELSE
        -- Find last sentence break within limit
        v_messages := array_append(v_messages, left(v_formatted, v_max_length));
        v_formatted := right(v_formatted, length(v_formatted) - v_max_length);
      END IF;
    END LOOP;
    
    RETURN jsonb_build_object('messages', v_messages, 'split', true, 'total_parts', array_length(v_messages, 1));
  ELSE
    -- Truncate
    RETURN jsonb_build_object('messages', ARRAY[left(v_formatted, v_max_length - 3) || '...'], 'split', false, 'truncated', true);
  END IF;
END;
$$;

COMMENT ON TABLE public.channel_format_config IS 'Per-workspace channel formatting overrides';
COMMENT ON TABLE public.channel_defaults IS 'System-wide channel defaults and capabilities';
COMMENT ON COLUMN public.channel_defaults.hard_limit_length IS 'Platform-enforced maximum (e.g., SMS 160)';