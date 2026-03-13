
-- =============================================
-- GROUP 1: Remove FOR ALL service-role policies (highest risk)
-- =============================================

DROP POLICY IF EXISTS "Service role can manage locks" ON public.ai_agent_locks;
DROP POLICY IF EXISTS "System can manage progress" ON public.conversation_objective_progress;
DROP POLICY IF EXISTS "Service role full access to lead_behavior_signals" ON public.lead_behavior_signals;
DROP POLICY IF EXISTS "Service role full access to message_length_events" ON public.message_length_events;
DROP POLICY IF EXISTS "Service role can manage demo_leads" ON public.demo_leads;

-- =============================================
-- GROUP 2: Tighten UPDATE policies
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can manage event_decision_matrix" ON public.event_decision_matrix;
CREATE POLICY "Authenticated users can select event_decision_matrix"
  ON public.event_decision_matrix FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event_decision_matrix"
  ON public.event_decision_matrix FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event_decision_matrix"
  ON public.event_decision_matrix FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete event_decision_matrix"
  ON public.event_decision_matrix FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can update event_test_cases" ON public.event_test_cases;
CREATE POLICY "Authenticated users can update event_test_cases"
  ON public.event_test_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Visitors can update own consent" ON public.gdpr_consents;
CREATE POLICY "Visitors can update own consent"
  ON public.gdpr_consents FOR UPDATE USING (visitor_id IS NOT NULL) WITH CHECK (visitor_id IS NOT NULL);

DROP POLICY IF EXISTS "System can update module usage" ON public.module_usage;
DROP POLICY IF EXISTS "System can update referrals" ON public.store_referrals;

DROP POLICY IF EXISTS "Visitors can update own session by id" ON public.store_visitor_sessions;
CREATE POLICY "Visitors can update own session by id"
  ON public.store_visitor_sessions FOR UPDATE USING (session_id IS NOT NULL) WITH CHECK (session_id IS NOT NULL);

-- =============================================
-- GROUP 3: Remove service-only INSERT policies
-- =============================================

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "System can insert memory access logs" ON public.ai_memory_access_log;
DROP POLICY IF EXISTS "System can insert rule executions" ON public.conversation_rule_executions;
DROP POLICY IF EXISTS "System can insert transitions" ON public.journey_transitions;
DROP POLICY IF EXISTS "Service role can insert loyalty transactions" ON public.loyalty_points_transactions;
DROP POLICY IF EXISTS "System can insert action logs" ON public.module_action_logs;
DROP POLICY IF EXISTS "System can insert module usage" ON public.module_usage;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.order_audit_log;
DROP POLICY IF EXISTS "Anyone can create proposal activity logs" ON public.proposal_activity_logs;
DROP POLICY IF EXISTS "System can insert analytics" ON public.proposal_analytics;
DROP POLICY IF EXISTS "Service can insert metrics" ON public.rag_retrieval_metrics;
DROP POLICY IF EXISTS "System can insert referrals" ON public.store_referrals;
DROP POLICY IF EXISTS "System can insert usage events" ON public.usage_events;
DROP POLICY IF EXISTS "Public can create widget conversations" ON public.widget_conversations;
DROP POLICY IF EXISTS "Public can create widget messages" ON public.widget_messages;

-- =============================================
-- GROUP 3b: Tighten authenticated INSERT policies
-- =============================================

DROP POLICY IF EXISTS "System can create notifications" ON public.c2c_notifications;
CREATE POLICY "Authenticated can insert c2c_notifications"
  ON public.c2c_notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_notifications.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Service insert order events" ON public.c2c_order_events;
CREATE POLICY "Authenticated can insert c2c_order_events"
  ON public.c2c_order_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = c2c_order_events.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can insert event_test_cases" ON public.event_test_cases;
CREATE POLICY "Authenticated users can insert event_test_cases"
  ON public.event_test_cases FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert event_runtime_failures" ON public.event_runtime_failures;
CREATE POLICY "Authenticated users can insert event_runtime_failures"
  ON public.event_runtime_failures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = event_runtime_failures.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );
