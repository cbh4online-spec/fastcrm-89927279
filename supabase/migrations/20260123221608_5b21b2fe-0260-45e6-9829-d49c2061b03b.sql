-- =====================================================
-- AUTOMATION 1: Payment Failed → Past Due
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_payment_failed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_opportunity_id UUID;
  v_assigned_to UUID;
BEGIN
  -- Only process payment_failed events
  IF NEW.event_type != 'payment_failed' THEN
    RETURN NEW;
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription 
  FROM subscriptions 
  WHERE id = NEW.subscription_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update subscription status to past_due
  UPDATE subscriptions
  SET status = 'past_due', updated_at = NOW()
  WHERE id = NEW.subscription_id;

  -- Update opportunity subscription_status if linked
  IF v_subscription.opportunity_id IS NOT NULL THEN
    UPDATE opportunities
    SET subscription_status = 'past_due', updated_at = NOW()
    WHERE id = v_subscription.opportunity_id
    RETURNING assigned_to INTO v_assigned_to;

    -- Create task for opportunity owner
    IF v_assigned_to IS NOT NULL THEN
      INSERT INTO tasks (
        workspace_id,
        title,
        description,
        assigned_to,
        due_date,
        priority,
        status,
        related_type,
        related_id
      ) VALUES (
        v_subscription.workspace_id,
        'Pagamento Falhado - Ação Necessária',
        'O pagamento da subscrição falhou. Por favor, contacte o cliente para resolver.',
        v_assigned_to,
        NOW() + INTERVAL '2 days',
        'high',
        'todo',
        'subscription',
        NEW.subscription_id
      );
    END IF;
  END IF;

  -- Create notification (insert into notifications table if exists)
  BEGIN
    INSERT INTO notifications (
      workspace_id,
      user_id,
      title,
      message,
      type,
      related_type,
      related_id
    )
    SELECT 
      v_subscription.workspace_id,
      wm.user_id,
      'Pagamento Falhado',
      'Uma subscrição teve o pagamento recusado e precisa de atenção.',
      'warning',
      'subscription',
      NEW.subscription_id
    FROM workspace_members wm
    WHERE wm.workspace_id = v_subscription.workspace_id
    AND wm.role IN ('owner', 'admin');
  EXCEPTION WHEN undefined_table THEN
    -- notifications table doesn't exist, skip
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- =====================================================
-- AUTOMATION 2: Payment Succeeded → Active
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_payment_succeeded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_next_payment DATE;
BEGIN
  -- Only process payment_succeeded events
  IF NEW.event_type != 'payment_succeeded' THEN
    RETURN NEW;
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription 
  FROM subscriptions 
  WHERE id = NEW.subscription_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate next payment date based on frequency
  CASE v_subscription.frequency
    WHEN 'weekly' THEN v_next_payment := CURRENT_DATE + INTERVAL '7 days';
    WHEN 'monthly' THEN v_next_payment := CURRENT_DATE + INTERVAL '1 month';
    WHEN 'quarterly' THEN v_next_payment := CURRENT_DATE + INTERVAL '3 months';
    WHEN 'semi_annual' THEN v_next_payment := CURRENT_DATE + INTERVAL '6 months';
    WHEN 'yearly' THEN v_next_payment := CURRENT_DATE + INTERVAL '1 year';
    ELSE v_next_payment := CURRENT_DATE + INTERVAL '1 month';
  END CASE;

  -- Update subscription
  UPDATE subscriptions
  SET 
    status = 'active',
    last_payment_date = NEW.occurred_at::date,
    next_payment_date = v_next_payment,
    updated_at = NOW()
  WHERE id = NEW.subscription_id;

  -- Update opportunity if linked
  IF v_subscription.opportunity_id IS NOT NULL THEN
    UPDATE opportunities
    SET 
      subscription_status = 'active',
      last_payment_date = NEW.occurred_at::date,
      next_payment_date = v_next_payment,
      updated_at = NOW()
    WHERE id = v_subscription.opportunity_id;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- AUTOMATION 4: Cancellation → Churn
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_subscription_canceled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_churn_stage_id UUID;
BEGIN
  -- Only process canceled events
  IF NEW.event_type != 'canceled' THEN
    RETURN NEW;
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription 
  FROM subscriptions 
  WHERE id = NEW.subscription_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Update subscription
  UPDATE subscriptions
  SET 
    status = 'cancelled',
    canceled_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.subscription_id;

  -- Update opportunity if linked
  IF v_subscription.opportunity_id IS NOT NULL THEN
    -- Try to find a "Churn" stage
    SELECT id INTO v_churn_stage_id
    FROM pipeline_stages
    WHERE workspace_id = v_subscription.workspace_id
    AND (LOWER(name) LIKE '%churn%' OR LOWER(name) LIKE '%cancel%')
    LIMIT 1;

    UPDATE opportunities
    SET 
      subscription_status = 'canceled',
      status = 'lost',
      stage_id = COALESCE(v_churn_stage_id, stage_id),
      updated_at = NOW()
    WHERE id = v_subscription.opportunity_id;

    -- Create task to capture churn reason
    INSERT INTO tasks (
      workspace_id,
      title,
      description,
      due_date,
      priority,
      status,
      related_type,
      related_id
    ) VALUES (
      v_subscription.workspace_id,
      'Registar Motivo de Churn',
      'A subscrição foi cancelada. Por favor, registe o motivo do cancelamento.',
      NOW() + INTERVAL '1 day',
      'medium',
      'todo',
      'subscription',
      NEW.subscription_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_payment_failed ON subscription_events;
DROP TRIGGER IF EXISTS trigger_payment_succeeded ON subscription_events;
DROP TRIGGER IF EXISTS trigger_subscription_canceled ON subscription_events;

-- Create triggers
CREATE TRIGGER trigger_payment_failed
  AFTER INSERT ON subscription_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_failed();

CREATE TRIGGER trigger_payment_succeeded
  AFTER INSERT ON subscription_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_succeeded();

CREATE TRIGGER trigger_subscription_canceled
  AFTER INSERT ON subscription_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_canceled();

-- =====================================================
-- AUTOMATION 3: Helper function for Renewal Approaching
-- Called by edge function cron job
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_upcoming_renewals(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  subscription_id UUID,
  workspace_id UUID,
  opportunity_id UUID,
  company_name TEXT,
  contact_name TEXT,
  mrr_amount NUMERIC,
  renewal_date DATE,
  days_until_renewal INTEGER,
  assigned_to UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.workspace_id,
    s.opportunity_id,
    c.name as company_name,
    ct.name as contact_name,
    s.mrr_amount,
    s.renewal_date::date,
    (s.renewal_date::date - CURRENT_DATE) as days_until_renewal,
    o.assigned_to
  FROM subscriptions s
  LEFT JOIN companies c ON s.company_id = c.id
  LEFT JOIN contacts ct ON s.contact_id = ct.id
  LEFT JOIN opportunities o ON s.opportunity_id = o.id
  WHERE s.status = 'active'
    AND s.renewal_date IS NOT NULL
    AND s.renewal_date::date <= CURRENT_DATE + days_ahead
    AND s.renewal_date::date >= CURRENT_DATE;
END;
$$;

-- Add comments
COMMENT ON FUNCTION handle_payment_failed IS 'Automation: Updates status to past_due on payment failure and creates tasks/notifications';
COMMENT ON FUNCTION handle_payment_succeeded IS 'Automation: Updates status to active on payment success and calculates next payment date';
COMMENT ON FUNCTION handle_subscription_canceled IS 'Automation: Handles subscription cancellation, updates status and creates churn tracking task';
COMMENT ON FUNCTION get_upcoming_renewals IS 'Helper function for cron job to find subscriptions with upcoming renewals';