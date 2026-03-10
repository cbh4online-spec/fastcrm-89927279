
-- Duo notifications table
CREATE TABLE public.vision_duo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_link_id UUID NOT NULL REFERENCES public.vision_duo_links(id) ON DELETE CASCADE,
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'briefing_completed', 'win_added', 'sprint_started', 'invite_accepted'
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vision_duo_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own duo notifications" ON public.vision_duo_notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update their own duo notifications" ON public.vision_duo_notifications FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "Authenticated users can insert duo notifications" ON public.vision_duo_notifications FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Allow duo partners to read vision data (read-only access for accepted duo links)
CREATE POLICY "Duo partners can view vision profiles" ON public.vision_profiles FOR SELECT USING (
  id IN (SELECT vision_id FROM public.vision_duo_links WHERE invitee_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Duo partners can view sprints" ON public.vision_sprints FOR SELECT USING (
  vision_id IN (SELECT vision_id FROM public.vision_duo_links WHERE invitee_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Duo partners can view briefings" ON public.vision_daily_briefings FOR SELECT USING (
  vision_id IN (SELECT vision_id FROM public.vision_duo_links WHERE invitee_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Duo partners can view wins" ON public.vision_wins FOR SELECT USING (
  vision_id IN (SELECT vision_id FROM public.vision_duo_links WHERE invitee_id = auth.uid() AND status = 'accepted')
);

-- Enable realtime for duo notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.vision_duo_notifications;
