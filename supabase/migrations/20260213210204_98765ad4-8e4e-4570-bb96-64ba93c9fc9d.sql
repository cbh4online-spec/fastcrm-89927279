
-- P0-5: Fix conversation_autopilot_state - replace permissive ALL USING(true) with workspace_members check
DROP POLICY IF EXISTS "System can manage autopilot state" ON public.conversation_autopilot_state;

CREATE POLICY "Workspace members can manage autopilot state"
ON public.conversation_autopilot_state
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = conversation_autopilot_state.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = conversation_autopilot_state.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR is_super_admin(auth.uid())
);

-- Also allow service_role (edge functions) to manage via a separate policy
CREATE POLICY "Service role can manage autopilot state"
ON public.conversation_autopilot_state
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- P1-2: Fix autopilot_events INSERT - replace WITH_CHECK(true)
DROP POLICY IF EXISTS "System can insert autopilot events" ON public.autopilot_events;

CREATE POLICY "Workspace members can insert autopilot events"
ON public.autopilot_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = autopilot_events.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Service role can insert autopilot events"
ON public.autopilot_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- P1-3: Fix conversation_journey - replace ALL USING(true) with workspace_members check
DROP POLICY IF EXISTS "System can manage journeys" ON public.conversation_journey;

CREATE POLICY "Workspace members can manage journeys"
ON public.conversation_journey
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = conversation_journey.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = conversation_journey.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Service role can manage journeys"
ON public.conversation_journey
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
