-- 1) agent_profiles
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  role_type text NOT NULL DEFAULT 'hybrid' CHECK (role_type IN ('sales','support','manager','admin','hybrid')),
  active boolean NOT NULL DEFAULT true,
  max_open_conversations integer NOT NULL DEFAULT 20,
  max_open_tickets integer NOT NULL DEFAULT 15,
  working_hours jsonb,
  skills text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{pt-PT}',
  channels text[] NOT NULL DEFAULT '{whatsapp}',
  auto_assignment_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','away','offline')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_ws ON public.agent_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_active ON public.agent_profiles(workspace_id, active) WHERE active = true;

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_profiles_select_workspace_members"
  ON public.agent_profiles FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "agent_profiles_insert_self_or_admin"
  ON public.agent_profiles FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
    )
  );

CREATE POLICY "agent_profiles_update_self_or_admin"
  ON public.agent_profiles FOR UPDATE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  );

CREATE POLICY "agent_profiles_delete_admin"
  ON public.agent_profiles FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE TRIGGER trg_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS quality_score numeric,
  ADD COLUMN IF NOT EXISTS quality_analysis jsonb,
  ADD COLUMN IF NOT EXISTS quality_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE OR REPLACE VIEW public.agent_performance_realtime
WITH (security_invoker = true)
AS
WITH agent_users AS (
  SELECT wm.workspace_id, wm.user_id, p.full_name, p.email, p.avatar_url, ap.role_type, ap.status,
         COALESCE(ap.max_open_conversations, 20) AS max_open_conversations,
         COALESCE(ap.max_open_tickets, 15) AS max_open_tickets
  FROM public.workspace_members wm
  LEFT JOIN public.profiles p ON p.user_id = wm.user_id
  LEFT JOIN public.agent_profiles ap ON ap.workspace_id = wm.workspace_id AND ap.user_id = wm.user_id
  WHERE wm.role IN ('owner','admin','agent')
),
conv_stats AS (
  SELECT
    workspace_id,
    assigned_to AS user_id,
    COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed','archived')) AS open_conversations,
    COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed','archived') AND ai_priority = 'urgent') AS urgent_open,
    COUNT(*) FILTER (WHERE resolved_at >= now() - interval '7 days') AS resolved_7d,
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) FILTER (WHERE first_response_at IS NOT NULL AND created_at >= now() - interval '7 days') AS avg_first_response_seconds_7d_raw,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at >= now() - interval '7 days') AS avg_resolution_seconds_7d_raw,
    AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL AND quality_analyzed_at >= now() - interval '30 days') AS quality_score_avg
  FROM public.conversations
  WHERE assigned_to IS NOT NULL
  GROUP BY workspace_id, assigned_to
),
ticket_stats AS (
  SELECT workspace_id, assigned_to AS user_id,
         COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed')) AS open_tickets,
         COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed') AND sla_deadline IS NOT NULL AND sla_deadline < now()) AS overdue_tickets,
         COUNT(*) FILTER (WHERE resolved_at >= now() - interval '7 days') AS resolved_tickets_7d
  FROM public.client_tickets
  WHERE assigned_to IS NOT NULL
  GROUP BY workspace_id, assigned_to
),
followup_stats AS (
  SELECT workspace_id, assigned_to AS user_id,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_followups,
         COUNT(*) FILTER (WHERE status = 'pending' AND due_at IS NOT NULL AND due_at < now()) AS overdue_followups,
         COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= now() - interval '7 days') AS completed_followups_7d
  FROM public.conversation_followups
  WHERE assigned_to IS NOT NULL
  GROUP BY workspace_id, assigned_to
),
share_stats AS (
  SELECT workspace_id, agent_id AS user_id,
         COUNT(*) FILTER (WHERE sent_at >= now() - interval '7 days') AS products_shared_7d
  FROM public.whatsapp_product_shares
  WHERE agent_id IS NOT NULL
  GROUP BY workspace_id, agent_id
)
SELECT
  au.workspace_id,
  au.user_id,
  au.full_name,
  au.email,
  au.avatar_url,
  au.role_type,
  au.status AS agent_status,
  au.max_open_conversations,
  au.max_open_tickets,
  COALESCE(cs.open_conversations, 0) AS open_conversations,
  COALESCE(cs.urgent_open, 0) AS urgent_open,
  COALESCE(cs.resolved_7d, 0) AS conversations_resolved_7d,
  cs.avg_first_response_seconds_7d_raw::integer AS avg_first_response_seconds_7d,
  cs.avg_resolution_seconds_7d_raw::integer AS avg_resolution_seconds_7d,
  cs.quality_score_avg,
  COALESCE(ts.open_tickets, 0) AS open_tickets,
  COALESCE(ts.overdue_tickets, 0) AS overdue_tickets,
  COALESCE(ts.resolved_tickets_7d, 0) AS tickets_resolved_7d,
  COALESCE(fs.pending_followups, 0) AS pending_followups,
  COALESCE(fs.overdue_followups, 0) AS overdue_followups,
  COALESCE(fs.completed_followups_7d, 0) AS completed_followups_7d,
  COALESCE(ss.products_shared_7d, 0) AS products_shared_7d,
  CASE
    WHEN (au.max_open_conversations + au.max_open_tickets) > 0
    THEN ROUND(((COALESCE(cs.open_conversations, 0) + COALESCE(ts.open_tickets, 0))::numeric / (au.max_open_conversations + au.max_open_tickets)) * 100, 1)
    ELSE 0
  END AS workload_pct,
  CASE
    WHEN (au.max_open_conversations + au.max_open_tickets) = 0 THEN 'unknown'
    WHEN ((COALESCE(cs.open_conversations, 0) + COALESCE(ts.open_tickets, 0))::numeric / (au.max_open_conversations + au.max_open_tickets)) > 0.85 THEN 'overloaded'
    WHEN ((COALESCE(cs.open_conversations, 0) + COALESCE(ts.open_tickets, 0))::numeric / (au.max_open_conversations + au.max_open_tickets)) >= 0.5 THEN 'balanced'
    ELSE 'available'
  END AS workload_status
FROM agent_users au
LEFT JOIN conv_stats cs ON cs.workspace_id = au.workspace_id AND cs.user_id = au.user_id
LEFT JOIN ticket_stats ts ON ts.workspace_id = au.workspace_id AND ts.user_id = au.user_id
LEFT JOIN followup_stats fs ON fs.workspace_id = au.workspace_id AND fs.user_id = au.user_id
LEFT JOIN share_stats ss ON ss.workspace_id = au.workspace_id AND ss.user_id = au.user_id;

CREATE OR REPLACE VIEW public.team_inbox_summary
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    c.workspace_id,
    COUNT(*) FILTER (WHERE c.status NOT IN ('resolved','closed','archived')) AS open_conversations,
    COUNT(*) FILTER (WHERE c.status NOT IN ('resolved','closed','archived') AND c.assigned_to IS NULL) AS unassigned_conversations,
    COUNT(*) FILTER (WHERE c.status NOT IN ('resolved','closed','archived') AND c.ai_priority = 'urgent') AS urgent_conversations,
    COUNT(*) FILTER (WHERE c.status NOT IN ('resolved','closed','archived') AND c.last_message_at < now() - interval '30 minutes' AND c.last_message_direction = 'inbound') AS stale_inbound,
    AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))) FILTER (WHERE c.first_response_at IS NOT NULL AND c.created_at >= now() - interval '1 day') AS avg_first_response_seconds_today_raw,
    COUNT(*) FILTER (WHERE c.resolved_at >= date_trunc('day', now())) AS resolved_today
  FROM public.conversations c
  GROUP BY c.workspace_id
)
SELECT
  workspace_id,
  open_conversations,
  unassigned_conversations,
  urgent_conversations,
  stale_inbound,
  avg_first_response_seconds_today_raw::integer AS avg_first_response_seconds_today,
  resolved_today
FROM base;

CREATE OR REPLACE FUNCTION public.list_assignable_agents(p_workspace_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role_type text,
  agent_status text,
  open_conversations bigint,
  open_tickets bigint,
  workload_pct numeric,
  workload_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    apr.user_id,
    apr.full_name,
    apr.email,
    apr.avatar_url,
    apr.role_type,
    apr.agent_status,
    apr.open_conversations,
    apr.open_tickets,
    apr.workload_pct,
    apr.workload_status
  FROM public.agent_performance_realtime apr
  WHERE apr.workspace_id = p_workspace_id
    AND p_workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  ORDER BY apr.workload_pct ASC NULLS FIRST, apr.full_name;
$$;

CREATE OR REPLACE FUNCTION public.assign_conversation(
  p_conversation_id uuid,
  p_assignee_user_id uuid,
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prev_assignee uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = v_actor) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  SELECT assigned_to INTO v_prev_assignee FROM public.conversations WHERE id = p_conversation_id AND workspace_id = p_workspace_id;

  UPDATE public.conversations
     SET assigned_to = p_assignee_user_id,
         updated_at = now()
   WHERE id = p_conversation_id AND workspace_id = p_workspace_id;

  BEGIN
    INSERT INTO public.whatsapp_communication_events (workspace_id, event_type, entity_type, entity_id, payload)
    VALUES (
      p_workspace_id,
      CASE WHEN v_prev_assignee IS NULL THEN 'communication.conversation.assigned' ELSE 'communication.conversation.transferred' END,
      'conversation',
      p_conversation_id,
      jsonb_build_object('actor_user_id', v_actor, 'from_user_id', v_prev_assignee, 'to_user_id', p_assignee_user_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'conversation_id', p_conversation_id, 'assigned_to', p_assignee_user_id, 'previous', v_prev_assignee);
END;
$$;

ALTER TABLE public.agent_ops_settings
  ADD COLUMN IF NOT EXISTS auto_distribution_method text DEFAULT 'manual' CHECK (auto_distribution_method IN ('manual','round_robin','least_loaded','skill_based','priority_based')),
  ADD COLUMN IF NOT EXISTS unanswered_alert_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS include_tickets_in_workload boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_followups_in_workload boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS quality_score_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coaching_ai_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_ranking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS individual_metrics_managers_only boolean DEFAULT true;
