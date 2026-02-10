
-- Referral settings per workspace
CREATE TABLE public.store_referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  referrer_reward_points INTEGER NOT NULL DEFAULT 50,
  referee_discount_percent NUMERIC(5,2) DEFAULT NULL,
  referee_discount_amount NUMERIC(10,2) DEFAULT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.store_referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active referral settings"
  ON public.store_referral_settings FOR SELECT
  USING (true);

CREATE POLICY "Workspace members can manage referral settings"
  ON public.store_referral_settings FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Referral codes per user
CREATE TABLE public.store_referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id),
  UNIQUE(code)
);

ALTER TABLE public.store_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own referral codes"
  ON public.store_referral_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own referral code"
  ON public.store_referral_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read referral codes for validation"
  ON public.store_referral_codes FOR SELECT
  USING (true);

-- Referral tracking
CREATE TABLE public.store_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL,
  referee_user_id UUID,
  referee_order_id UUID REFERENCES public.store_orders(id),
  referral_code_id UUID NOT NULL REFERENCES public.store_referral_codes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  referrer_rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.store_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own referrals as referrer"
  ON public.store_referrals FOR SELECT
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Workspace members can read all referrals"
  ON public.store_referrals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert referrals"
  ON public.store_referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.store_referrals FOR UPDATE
  USING (true);

-- Function to reward referrer when order is paid
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_settings RECORD;
  v_balance BIGINT;
BEGIN
  -- Only process when status changes to paid
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Find pending referral for this order
    SELECT r.*, rc.user_id AS referrer_id
    INTO v_referral
    FROM store_referrals r
    JOIN store_referral_codes rc ON rc.id = r.referral_code_id
    WHERE r.referee_order_id = NEW.id
      AND r.status = 'pending'
      AND r.referrer_rewarded = false
    LIMIT 1;

    IF v_referral IS NOT NULL THEN
      -- Get settings
      SELECT * INTO v_settings
      FROM store_referral_settings
      WHERE workspace_id = NEW.workspace_id AND is_active = true;

      IF v_settings IS NOT NULL AND v_settings.referrer_reward_points > 0 THEN
        -- Calculate current balance
        SELECT COALESCE(SUM(points), 0) INTO v_balance
        FROM loyalty_points_transactions
        WHERE user_id = v_referral.referrer_id
          AND workspace_id = NEW.workspace_id;

        -- Credit points to referrer
        INSERT INTO loyalty_points_transactions (
          workspace_id, user_id, order_id, points, type, description, balance_after
        ) VALUES (
          NEW.workspace_id,
          v_referral.referrer_id,
          NEW.id,
          v_settings.referrer_reward_points,
          'earned',
          'Recompensa de referral - encomenda #' || NEW.order_number,
          v_balance + v_settings.referrer_reward_points
        );

        -- Mark referral as completed
        UPDATE store_referrals
        SET status = 'completed',
            referrer_rewarded = true,
            completed_at = now()
        WHERE id = v_referral.id;

        -- Increment uses count
        UPDATE store_referral_codes
        SET uses_count = uses_count + 1
        WHERE id = v_referral.referral_code_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_referral_reward
  AFTER UPDATE ON public.store_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_reward();
