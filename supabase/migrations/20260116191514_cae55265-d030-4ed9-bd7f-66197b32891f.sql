-- =============================================
-- TRIAL SYSTEM - Complete Implementation (Fixed)
-- =============================================

-- 1) Add trial fields to marketplace_modules
ALTER TABLE public.marketplace_modules 
ADD COLUMN IF NOT EXISTS trial_uses_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_time_limit_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_start_event TEXT DEFAULT 'first_use';

-- 2) Add trial tracking fields to workspace_modules
ALTER TABLE public.workspace_modules 
ADD COLUMN IF NOT EXISTS trial_uses_consumed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS value_generated JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_alert_shown TEXT,
ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP WITH TIME ZONE;

-- 3) Create trial usage logs table
CREATE TABLE IF NOT EXISTS public.module_trial_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_key TEXT,
  uses_before INTEGER,
  uses_after INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) Create trial conversion events table
CREATE TABLE IF NOT EXISTS public.module_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  conversion_type TEXT NOT NULL,
  trial_uses_consumed INTEGER,
  trial_days_used INTEGER,
  value_generated JSONB DEFAULT '{}',
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  price_paid NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) Create trial alerts table (without function in UNIQUE - using separate columns)
CREATE TABLE IF NOT EXISTS public.module_trial_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  uses_remaining INTEGER,
  days_remaining INTEGER,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shown_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create unique index instead of constraint with function
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_trial_alerts_unique 
ON public.module_trial_alerts(workspace_id, module_id, alert_type, shown_date);

-- 6) Enable RLS on new tables
ALTER TABLE public.module_trial_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_trial_alerts ENABLE ROW LEVEL SECURITY;

-- 7) RLS Policies for module_trial_logs
CREATE POLICY "Users can view trial logs for their workspaces"
  ON public.module_trial_logs FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert trial logs"
  ON public.module_trial_logs FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 8) RLS Policies for module_conversions  
CREATE POLICY "Users can view conversions for their workspaces"
  ON public.module_conversions FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert conversions"
  ON public.module_conversions FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 9) RLS Policies for module_trial_alerts
CREATE POLICY "Users can view alerts for their workspaces"
  ON public.module_trial_alerts FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert alerts"
  ON public.module_trial_alerts FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update their alerts"
  ON public.module_trial_alerts FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 10) Update marketplace_modules with trial limits
UPDATE public.marketplace_modules SET 
  trial_uses_limit = CASE 
    WHEN category = 'connector' THEN 50
    WHEN category = 'ai_pack' THEN 20
    WHEN category = 'app' THEN 10
    WHEN category = 'template' THEN 1
    ELSE 10
  END,
  trial_time_limit_days = CASE
    WHEN category = 'app' THEN 7
    ELSE NULL
  END,
  trial_start_event = 'first_use'
WHERE trial_uses_limit IS NULL;

-- 11) Function to start a trial
CREATE OR REPLACE FUNCTION public.start_module_trial(
  p_workspace_id UUID,
  p_module_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_module RECORD;
  v_existing RECORD;
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_module FROM public.marketplace_modules WHERE id = p_module_id;
  IF v_module IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'module_not_found');
  END IF;
  
  SELECT * INTO v_existing 
  FROM public.workspace_modules 
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  IF v_existing IS NOT NULL THEN
    IF v_existing.status IN ('active', 'trial') THEN
      RETURN jsonb_build_object(
        'success', true, 
        'already_active', true,
        'status', v_existing.status
      );
    END IF;
  END IF;
  
  IF v_module.trial_time_limit_days IS NOT NULL THEN
    v_trial_ends_at := now() + (v_module.trial_time_limit_days || ' days')::INTERVAL;
  ELSE
    v_trial_ends_at := now() + '365 days'::INTERVAL;
  END IF;
  
  INSERT INTO public.workspace_modules (
    workspace_id, module_id, status, subscribed_at, subscribed_by,
    trial_ends_at, trial_started_at, trial_uses_consumed, current_period_start
  ) VALUES (
    p_workspace_id, p_module_id, 'trial', now(), COALESCE(p_user_id, auth.uid()),
    v_trial_ends_at, now(), 0, now()
  )
  ON CONFLICT (workspace_id, module_id) DO UPDATE SET
    status = 'trial',
    trial_ends_at = v_trial_ends_at,
    trial_started_at = now(),
    trial_uses_consumed = 0,
    current_period_start = now();
  
  INSERT INTO public.module_trial_logs (
    workspace_id, module_id, user_id, action_type, uses_before, uses_after, metadata
  ) VALUES (
    p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
    'trial_started', 0, 0,
    jsonb_build_object(
      'uses_limit', v_module.trial_uses_limit,
      'time_limit_days', v_module.trial_time_limit_days,
      'trial_ends_at', v_trial_ends_at
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'trial_uses_limit', v_module.trial_uses_limit,
    'trial_time_limit_days', v_module.trial_time_limit_days,
    'trial_ends_at', v_trial_ends_at
  );
END;
$$;

-- 12) Function to consume trial usage
CREATE OR REPLACE FUNCTION public.consume_trial_usage(
  p_workspace_id UUID,
  p_module_id UUID,
  p_action_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_module RECORD;
  v_installation RECORD;
  v_uses_before INTEGER;
  v_uses_after INTEGER;
  v_uses_remaining INTEGER;
  v_usage_percent INTEGER;
  v_alert_type TEXT;
  v_alert_message TEXT;
BEGIN
  SELECT mm.trial_uses_limit, mm.trial_time_limit_days, 
         wm.status, wm.trial_uses_consumed, wm.trial_ends_at, wm.trial_started_at,
         wm.last_alert_shown, wm.grace_period_ends_at
  INTO v_installation
  FROM public.marketplace_modules mm
  JOIN public.workspace_modules wm ON wm.module_id = mm.id
  WHERE mm.id = p_module_id AND wm.workspace_id = p_workspace_id;
  
  IF v_installation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'module_not_installed', 'can_use', false);
  END IF;
  
  IF v_installation.status = 'trial' AND v_installation.trial_ends_at < now() THEN
    IF v_installation.grace_period_ends_at IS NULL OR v_installation.grace_period_ends_at < now() THEN
      UPDATE public.workspace_modules 
      SET status = 'expired' 
      WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
      
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'trial_expired', 
        'can_use', false,
        'reason', 'time_limit_reached',
        'show_upgrade_modal', true
      );
    END IF;
  END IF;
  
  IF v_installation.status = 'active' THEN
    INSERT INTO public.module_trial_logs (
      workspace_id, module_id, user_id, action_type, action_key, metadata
    ) VALUES (
      p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
      'action_consumed', p_action_key, p_metadata
    );
    
    RETURN jsonb_build_object('success', true, 'can_use', true, 'is_paid', true);
  END IF;
  
  v_uses_before := COALESCE(v_installation.trial_uses_consumed, 0);
  
  IF v_installation.trial_uses_limit IS NOT NULL AND v_uses_before >= v_installation.trial_uses_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'trial_uses_exhausted',
      'can_use', false,
      'uses_consumed', v_uses_before,
      'uses_limit', v_installation.trial_uses_limit,
      'show_upgrade_modal', true
    );
  END IF;
  
  v_uses_after := v_uses_before + 1;
  v_uses_remaining := COALESCE(v_installation.trial_uses_limit, 999) - v_uses_after;
  
  UPDATE public.workspace_modules 
  SET trial_uses_consumed = v_uses_after
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  INSERT INTO public.module_trial_logs (
    workspace_id, module_id, user_id, action_type, action_key, 
    uses_before, uses_after, metadata
  ) VALUES (
    p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
    'action_consumed', p_action_key, v_uses_before, v_uses_after, p_metadata
  );
  
  IF v_installation.trial_uses_limit IS NOT NULL AND v_installation.trial_uses_limit > 0 THEN
    v_usage_percent := (v_uses_after::NUMERIC / v_installation.trial_uses_limit::NUMERIC * 100)::INTEGER;
    
    IF v_uses_remaining = 0 AND v_installation.last_alert_shown IS DISTINCT FROM 'last_use' THEN
      v_alert_type := 'last_use';
      v_alert_message := 'Esta foi a última utilização gratuita deste módulo.';
    ELSIF v_usage_percent >= 90 AND v_installation.last_alert_shown IS DISTINCT FROM 'usage_90' THEN
      v_alert_type := 'usage_90';
      v_alert_message := format('Tens %s utilizações gratuitas restantes.', v_uses_remaining);
    ELSIF v_usage_percent >= 70 AND v_installation.last_alert_shown IS DISTINCT FROM 'usage_70' THEN
      v_alert_type := 'usage_70';
      v_alert_message := format('Tens %s utilizações gratuitas restantes.', v_uses_remaining);
    END IF;
    
    IF v_alert_type IS NOT NULL THEN
      UPDATE public.workspace_modules 
      SET last_alert_shown = v_alert_type, last_alert_at = now()
      WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
      
      INSERT INTO public.module_trial_alerts (
        workspace_id, module_id, user_id, alert_type, alert_message, uses_remaining, shown_date
      ) VALUES (
        p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
        v_alert_type, v_alert_message, v_uses_remaining, CURRENT_DATE
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'can_use', true,
    'uses_consumed', v_uses_after,
    'uses_limit', v_installation.trial_uses_limit,
    'uses_remaining', v_uses_remaining,
    'alert', CASE WHEN v_alert_type IS NOT NULL THEN jsonb_build_object(
      'type', v_alert_type,
      'message', v_alert_message
    ) ELSE NULL END
  );
END;
$$;

-- 13) Function to get trial status
CREATE OR REPLACE FUNCTION public.get_module_trial_status(
  p_workspace_id UUID,
  p_module_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_installation RECORD;
  v_uses_remaining INTEGER;
  v_days_remaining INTEGER;
  v_usage_percent INTEGER;
BEGIN
  SELECT mm.trial_uses_limit, mm.trial_time_limit_days, mm.name as module_name,
         wm.status, wm.trial_uses_consumed, wm.trial_ends_at, 
         wm.trial_started_at, wm.value_generated
  INTO v_installation
  FROM public.marketplace_modules mm
  LEFT JOIN public.workspace_modules wm ON wm.module_id = mm.id AND wm.workspace_id = p_workspace_id
  WHERE mm.id = p_module_id;
  
  IF v_installation IS NULL THEN
    RETURN jsonb_build_object('error', 'module_not_found');
  END IF;
  
  IF v_installation.status IS NULL THEN
    RETURN jsonb_build_object(
      'installed', false,
      'can_start_trial', true,
      'trial_uses_limit', v_installation.trial_uses_limit,
      'trial_time_limit_days', v_installation.trial_time_limit_days
    );
  END IF;
  
  v_uses_remaining := COALESCE(v_installation.trial_uses_limit, 999) - COALESCE(v_installation.trial_uses_consumed, 0);
  
  IF v_installation.trial_ends_at IS NOT NULL THEN
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_installation.trial_ends_at - now())::INTEGER);
  END IF;
  
  IF v_installation.trial_uses_limit IS NOT NULL AND v_installation.trial_uses_limit > 0 THEN
    v_usage_percent := (COALESCE(v_installation.trial_uses_consumed, 0)::NUMERIC / v_installation.trial_uses_limit::NUMERIC * 100)::INTEGER;
  ELSE
    v_usage_percent := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'installed', true,
    'status', v_installation.status,
    'is_trial', v_installation.status = 'trial',
    'is_paid', v_installation.status = 'active',
    'uses_consumed', COALESCE(v_installation.trial_uses_consumed, 0),
    'uses_limit', v_installation.trial_uses_limit,
    'uses_remaining', v_uses_remaining,
    'usage_percent', v_usage_percent,
    'days_remaining', v_days_remaining,
    'trial_started_at', v_installation.trial_started_at,
    'trial_ends_at', v_installation.trial_ends_at,
    'value_generated', v_installation.value_generated,
    'can_use', CASE 
      WHEN v_installation.status = 'active' THEN true
      WHEN v_installation.status = 'trial' AND v_uses_remaining > 0 THEN true
      ELSE false
    END
  );
END;
$$;

-- 14) Function to convert trial to paid
CREATE OR REPLACE FUNCTION public.convert_trial_to_paid(
  p_workspace_id UUID,
  p_module_id UUID,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_price_paid NUMERIC DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_installation RECORD;
  v_trial_uses INTEGER;
  v_trial_days INTEGER;
BEGIN
  SELECT * INTO v_installation
  FROM public.workspace_modules
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  IF v_installation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'module_not_installed');
  END IF;
  
  v_trial_uses := COALESCE(v_installation.trial_uses_consumed, 0);
  IF v_installation.trial_started_at IS NOT NULL THEN
    v_trial_days := EXTRACT(DAY FROM now() - v_installation.trial_started_at)::INTEGER;
  END IF;
  
  UPDATE public.workspace_modules SET
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + '30 days'::INTERVAL,
    trial_ends_at = NULL,
    cancel_at_period_end = false
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  INSERT INTO public.module_conversions (
    workspace_id, module_id, user_id, conversion_type,
    trial_uses_consumed, trial_days_used, value_generated,
    stripe_subscription_id, price_paid
  ) VALUES (
    p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
    'trial_to_paid', v_trial_uses, v_trial_days, 
    v_installation.value_generated, p_stripe_subscription_id, p_price_paid
  );
  
  INSERT INTO public.module_trial_logs (
    workspace_id, module_id, user_id, action_type, metadata
  ) VALUES (
    p_workspace_id, p_module_id, COALESCE(p_user_id, auth.uid()),
    'converted', jsonb_build_object(
      'trial_uses', v_trial_uses,
      'trial_days', v_trial_days,
      'price_paid', p_price_paid
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'status', 'active',
    'trial_uses_consumed', v_trial_uses,
    'trial_days_used', v_trial_days
  );
END;
$$;

-- 15) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_trial_logs_workspace ON public.module_trial_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_module_trial_logs_module ON public.module_trial_logs(module_id);
CREATE INDEX IF NOT EXISTS idx_module_trial_logs_created ON public.module_trial_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_conversions_workspace ON public.module_conversions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_module_trial_alerts_workspace ON public.module_trial_alerts(workspace_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_workspace_modules_trial ON public.workspace_modules(workspace_id, status) WHERE status = 'trial';