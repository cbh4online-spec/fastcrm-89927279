DROP POLICY IF EXISTS "Anyone can create widget conversations" ON public.widget_conversations;
DROP POLICY IF EXISTS "Public can create widget conversations" ON public.widget_conversations;
CREATE POLICY "Public can create widget conversations" ON public.widget_conversations
FOR INSERT TO anon, authenticated
WITH CHECK (
  status IS NULL OR status = 'active' OR status = 'open'
) ;
DROP POLICY "Public can create widget conversations" ON public.widget_conversations;
CREATE POLICY "Public can create widget conversations" ON public.widget_conversations
FOR INSERT TO anon, authenticated
WITH CHECK (
  lead_id IS NULL AND transferred_to_inbox_at IS NULL
  AND EXISTS (SELECT 1 FROM public.widget_configurations w
              WHERE w.id = widget_id AND w.workspace_id = widget_conversations.workspace_id AND w.is_active = true)
);

DROP POLICY IF EXISTS "anon_insert_nurture_queue" ON public.funnel_nurture_queue;
CREATE POLICY "anon_insert_nurture_queue" ON public.funnel_nurture_queue
FOR INSERT TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.funnels f
          WHERE f.id = funnel_id AND f.workspace_id = funnel_nurture_queue.workspace_id AND f.is_published = true)
);

DROP POLICY IF EXISTS "System can create notifications" ON public.c2c_notifications;
CREATE POLICY "Members can create notifications" ON public.c2c_notifications
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id)
);