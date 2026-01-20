-- =====================================================
-- FASTCRM MARKETING MODULE - Complete Schema
-- =====================================================

-- Email Marketing Settings per Workspace
CREATE TABLE public.marketing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  monthly_email_limit INTEGER DEFAULT 1000,
  active_contacts_limit INTEGER DEFAULT 500,
  active_campaigns_limit INTEGER DEFAULT 5,
  default_from_name TEXT,
  default_reply_to TEXT,
  unsubscribe_page_url TEXT,
  custom_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Email Segments
CREATE TABLE public.marketing_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_rules JSONB NOT NULL DEFAULT '{}',
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Templates
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT NOT NULL,
  reply_to TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_id UUID REFERENCES public.marketing_templates(id),
  segment_id UUID REFERENCES public.marketing_segments(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign Recipients (individual sends)
CREATE TABLE public.marketing_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed')),
  resend_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT,
  bounce_reason TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Events (webhook tracking)
CREATE TABLE public.marketing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.marketing_recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  email TEXT,
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact Email Preferences / Subscriptions
CREATE TABLE public.marketing_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  consent_source TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Marketing Usage / Audit
CREATE TABLE public.marketing_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_limit INTEGER DEFAULT 1000,
  active_contacts INTEGER DEFAULT 0,
  contacts_limit INTEGER DEFAULT 500,
  active_campaigns INTEGER DEFAULT 0,
  campaigns_limit INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_start)
);

-- Click Tracking Links
CREATE TABLE public.marketing_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  tracking_code TEXT NOT NULL UNIQUE,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_settings
CREATE POLICY "Users can view marketing settings for their workspace"
  ON public.marketing_settings FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage marketing settings for their workspace"
  ON public.marketing_settings FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_segments
CREATE POLICY "Users can view segments for their workspace"
  ON public.marketing_segments FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage segments for their workspace"
  ON public.marketing_segments FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_templates
CREATE POLICY "Users can view templates for their workspace"
  ON public.marketing_templates FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage templates for their workspace"
  ON public.marketing_templates FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_campaigns
CREATE POLICY "Users can view campaigns for their workspace"
  ON public.marketing_campaigns FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage campaigns for their workspace"
  ON public.marketing_campaigns FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_recipients
CREATE POLICY "Users can view recipients for their workspace"
  ON public.marketing_recipients FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage recipients for their workspace"
  ON public.marketing_recipients FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_events
CREATE POLICY "Users can view events for their workspace"
  ON public.marketing_events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert events for their workspace"
  ON public.marketing_events FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_subscriptions
CREATE POLICY "Users can view subscriptions for their workspace"
  ON public.marketing_subscriptions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage subscriptions for their workspace"
  ON public.marketing_subscriptions FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_usage
CREATE POLICY "Users can view usage for their workspace"
  ON public.marketing_usage FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage usage for their workspace"
  ON public.marketing_usage FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for marketing_links
CREATE POLICY "Users can view links for their workspace"
  ON public.marketing_links FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage links for their workspace"
  ON public.marketing_links FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_marketing_campaigns_workspace ON public.marketing_campaigns(workspace_id);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_recipients_campaign ON public.marketing_recipients(campaign_id);
CREATE INDEX idx_marketing_recipients_email ON public.marketing_recipients(email);
CREATE INDEX idx_marketing_events_campaign ON public.marketing_events(campaign_id);
CREATE INDEX idx_marketing_events_type ON public.marketing_events(event_type);
CREATE INDEX idx_marketing_subscriptions_email ON public.marketing_subscriptions(email);
CREATE INDEX idx_marketing_links_code ON public.marketing_links(tracking_code);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_settings_updated_at
  BEFORE UPDATE ON public.marketing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_segments_updated_at
  BEFORE UPDATE ON public.marketing_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_recipients_updated_at
  BEFORE UPDATE ON public.marketing_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_subscriptions_updated_at
  BEFORE UPDATE ON public.marketing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_usage_updated_at
  BEFORE UPDATE ON public.marketing_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();