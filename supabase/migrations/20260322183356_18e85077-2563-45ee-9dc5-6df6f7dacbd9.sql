
-- RPC: Check and downgrade expired trials and subscriptions
CREATE OR REPLACE FUNCTION public.check_and_downgrade_expired_trials()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_count int := 0;
  v_expired_count int := 0;
  v_rec record;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- 1. Downgrade expired trials
  FOR v_rec IN
    SELECT ws.id as workspace_id, ws.name as workspace_name, sub.plan, sub.trial_ends_at
    FROM workspace_subscriptions sub
    JOIN workspaces ws ON ws.id = sub.workspace_id
    WHERE sub.status = 'trialing'
      AND sub.trial_ends_at IS NOT NULL
      AND sub.trial_ends_at < now()
  LOOP
    UPDATE workspace_subscriptions
    SET plan = 'starter', status = 'active', trial_ends_at = NULL, updated_at = now()
    WHERE workspace_id = v_rec.workspace_id;

    -- Create admin notification
    INSERT INTO admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (v_rec.workspace_id, 'trial_expired',
      'Trial expirado — ' || v_rec.workspace_name,
      'O trial do workspace "' || v_rec.workspace_name || '" expirou. Plano alterado para Free.',
      jsonb_build_object('previous_plan', v_rec.plan, 'action', 'downgraded_to_free'));

    v_results := v_results || jsonb_build_object('workspace_id', v_rec.workspace_id, 'type', 'trial_expired', 'name', v_rec.workspace_name);
    v_trial_count := v_trial_count + 1;
  END LOOP;

  -- 2. Downgrade expired paid subscriptions (no Stripe = manual)
  FOR v_rec IN
    SELECT ws.id as workspace_id, ws.name as workspace_name, sub.plan, sub.current_period_end
    FROM workspace_subscriptions sub
    JOIN workspaces ws ON ws.id = sub.workspace_id
    WHERE sub.status = 'active'
      AND sub.plan NOT IN ('starter', 'free')
      AND sub.current_period_end IS NOT NULL
      AND sub.current_period_end < now()
      AND (sub.stripe_subscription_id IS NULL OR sub.stripe_subscription_id = '')
  LOOP
    UPDATE workspace_subscriptions
    SET plan = 'starter', updated_at = now()
    WHERE workspace_id = v_rec.workspace_id;

    INSERT INTO admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (v_rec.workspace_id, 'subscription_expired',
      'Subscrição expirada — ' || v_rec.workspace_name,
      'A subscrição do workspace "' || v_rec.workspace_name || '" expirou sem renovação.',
      jsonb_build_object('previous_plan', v_rec.plan, 'action', 'downgraded_to_free'));

    v_results := v_results || jsonb_build_object('workspace_id', v_rec.workspace_id, 'type', 'subscription_expired', 'name', v_rec.workspace_name);
    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'trials_downgraded', v_trial_count,
    'subscriptions_downgraded', v_expired_count,
    'details', v_results
  );
END;
$$;

-- Trigger: notify admin on new workspace creation
CREATE OR REPLACE FUNCTION public.notify_admin_new_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_notifications (workspace_id, type, title, message, metadata)
  VALUES (
    NEW.id,
    'new_workspace',
    'Novo workspace criado: ' || NEW.name,
    'O workspace "' || NEW.name || '" foi criado.',
    jsonb_build_object('workspace_id', NEW.id, 'workspace_name', NEW.name, 'slug', NEW.slug)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_workspace ON workspaces;
CREATE TRIGGER trg_notify_admin_new_workspace
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_workspace();

-- Trigger: notify admin on new workspace member
CREATE OR REPLACE FUNCTION public.notify_admin_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws_name text;
  v_user_email text;
BEGIN
  SELECT name INTO v_ws_name FROM workspaces WHERE id = NEW.workspace_id;
  SELECT email INTO v_user_email FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO admin_notifications (workspace_id, user_id, type, title, message, metadata)
  VALUES (
    NEW.workspace_id,
    NEW.user_id,
    'new_member',
    'Novo membro: ' || COALESCE(v_user_email, 'desconhecido'),
    'O utilizador "' || COALESCE(v_user_email, 'desconhecido') || '" juntou-se ao workspace "' || COALESCE(v_ws_name, '') || '".',
    jsonb_build_object('user_id', NEW.user_id, 'user_email', v_user_email, 'workspace_name', v_ws_name, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_member ON workspace_members;
CREATE TRIGGER trg_notify_admin_new_member
  AFTER INSERT ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_member();

-- Super admin full access on admin_notifications (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_notifications' AND policyname = 'Super admin full access admin_notifications'
  ) THEN
    CREATE POLICY "Super admin full access admin_notifications"
      ON admin_notifications FOR ALL
      USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;
