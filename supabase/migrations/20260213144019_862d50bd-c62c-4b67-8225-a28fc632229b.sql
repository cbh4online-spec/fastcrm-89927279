
-- =============================================
-- Phase 3: Booking Calendars, Follow-up Policies, Follow-up Queue
-- =============================================

-- 1. ai_booking_calendars
CREATE TABLE public.ai_booking_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL,
  calendar_name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  is_fallback BOOLEAN DEFAULT false,
  allow_cancel BOOLEAN DEFAULT false,
  post_booking_actions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_booking_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking calendars in their workspace"
  ON public.ai_booking_calendars FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert booking calendars in their workspace"
  ON public.ai_booking_calendars FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update booking calendars in their workspace"
  ON public.ai_booking_calendars FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete booking calendars in their workspace"
  ON public.ai_booking_calendars FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2. ai_followup_policies
CREATE TABLE public.ai_followup_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  scenarios JSONB DEFAULT '{}',
  cadence JSONB DEFAULT '{"delays_minutes": [60, 360, 1440]}',
  working_hours JSONB DEFAULT '{}',
  allow_channel_switching BOOLEAN DEFAULT false,
  switch_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_followup_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view followup policies in their workspace"
  ON public.ai_followup_policies FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert followup policies in their workspace"
  ON public.ai_followup_policies FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update followup policies in their workspace"
  ON public.ai_followup_policies FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete followup policies in their workspace"
  ON public.ai_followup_policies FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. followup_queue
CREATE TABLE public.followup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.ai_followup_policies(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  step_index INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.followup_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_followup_queue_pending ON public.followup_queue (status, next_run_at) WHERE status = 'pending';

CREATE POLICY "Users can view followup queue in their workspace"
  ON public.followup_queue FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert followup queue in their workspace"
  ON public.followup_queue FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update followup queue in their workspace"
  ON public.followup_queue FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete followup queue in their workspace"
  ON public.followup_queue FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
