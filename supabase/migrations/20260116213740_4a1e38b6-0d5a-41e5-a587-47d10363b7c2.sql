-- Create meeting automation events table
CREATE TABLE public.meeting_automation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('completed', 'no_show', 'internal_completed', 'inactivity_alert')),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'status_change', 'scheduled', 'system')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  actions_executed JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_by UUID
);

-- Create meeting reschedule requests table
CREATE TABLE public.meeting_reschedule_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  original_meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  new_meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  reschedule_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  suggested_slots JSONB DEFAULT '[]'::jsonb,
  message_sent_at TIMESTAMPTZ,
  message_channel TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Create inactivity alerts table
CREATE TABLE public.inactivity_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('no_followup', 'no_contact', 'stale_opportunity', 'overdue_task')),
  entity_type TEXT NOT NULL,
  entity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  entity_count INTEGER NOT NULL DEFAULT 0,
  days_inactive INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'dismissed')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

-- Create team feed posts table for internal meetings
CREATE TABLE public.team_feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'meeting_summary' CHECK (post_type IN ('meeting_summary', 'announcement', 'achievement', 'update', 'question')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team feed comments table
CREATE TABLE public.team_feed_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.team_feed_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_meeting_automation_events_workspace ON public.meeting_automation_events(workspace_id);
CREATE INDEX idx_meeting_automation_events_meeting ON public.meeting_automation_events(meeting_id);
CREATE INDEX idx_meeting_automation_events_status ON public.meeting_automation_events(status);
CREATE INDEX idx_meeting_reschedule_requests_token ON public.meeting_reschedule_requests(reschedule_token);
CREATE INDEX idx_inactivity_alerts_user ON public.inactivity_alerts(user_id, status);
CREATE INDEX idx_inactivity_alerts_workspace ON public.inactivity_alerts(workspace_id, status);
CREATE INDEX idx_team_feed_posts_workspace ON public.team_feed_posts(workspace_id, created_at DESC);
CREATE INDEX idx_team_feed_comments_post ON public.team_feed_comments(post_id);

-- Enable RLS
ALTER TABLE public.meeting_automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inactivity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view automation events in their workspace"
  ON public.meeting_automation_events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create automation events in their workspace"
  ON public.meeting_automation_events FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view reschedule requests in their workspace"
  ON public.meeting_reschedule_requests FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage reschedule requests in their workspace"
  ON public.meeting_reschedule_requests FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their inactivity alerts"
  ON public.inactivity_alerts FOR SELECT
  USING (user_id = auth.uid() OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "System can manage inactivity alerts"
  ON public.inactivity_alerts FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view team feed in their workspace"
  ON public.team_feed_posts FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create posts in their workspace"
  ON public.team_feed_posts FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON public.team_feed_posts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view comments in their workspace posts"
  ON public.team_feed_comments FOR SELECT
  USING (post_id IN (SELECT id FROM public.team_feed_posts WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can create comments in their workspace"
  ON public.team_feed_comments FOR INSERT
  WITH CHECK (post_id IN (SELECT id FROM public.team_feed_posts WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their own comments"
  ON public.team_feed_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_team_feed_posts_updated_at
  BEFORE UPDATE ON public.team_feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_feed_comments_updated_at
  BEFORE UPDATE ON public.team_feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for inactivity alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.inactivity_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_feed_posts;