
-- Loyalty Settings table (one per workspace)
CREATE TABLE public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  points_per_euro NUMERIC NOT NULL DEFAULT 1,
  points_value_cents NUMERIC NOT NULL DEFAULT 1,
  min_redeem_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings for their workspace
CREATE POLICY "Workspace members can view loyalty settings"
  ON public.loyalty_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage loyalty settings"
  ON public.loyalty_settings FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public read for store visitors (only is_active check)
CREATE POLICY "Public can read active loyalty settings"
  ON public.loyalty_settings FOR SELECT
  USING (is_active = true);

-- Loyalty Points Transactions table
CREATE TABLE public.loyalty_points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  description TEXT,
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see their own transactions
CREATE POLICY "Users can view their own loyalty transactions"
  ON public.loyalty_points_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Workspace admins can view all transactions
CREATE POLICY "Admins can view all workspace loyalty transactions"
  ON public.loyalty_points_transactions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only system (service role) inserts transactions via triggers/functions
CREATE POLICY "Service role can insert loyalty transactions"
  ON public.loyalty_points_transactions FOR INSERT
  WITH CHECK (true);

-- Function to get loyalty balance
CREATE OR REPLACE FUNCTION public.get_loyalty_balance(p_user_id UUID, p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM public.loyalty_points_transactions
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
$$;

-- Trigger function: credit loyalty points when order status changes to 'paid'
CREATE OR REPLACE FUNCTION public.credit_loyalty_points_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_points INTEGER;
  v_balance INTEGER;
BEGIN
  -- Only fire when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if loyalty is active for this workspace
    SELECT * INTO v_settings
    FROM public.loyalty_settings
    WHERE workspace_id = NEW.workspace_id AND is_active = true;

    IF v_settings IS NULL THEN
      RETURN NEW;
    END IF;

    -- Only credit if user_id is set (authenticated purchase)
    IF NEW.user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Check if points already credited for this order
    IF EXISTS (
      SELECT 1 FROM public.loyalty_points_transactions
      WHERE order_id = NEW.id AND type = 'earned'
    ) THEN
      RETURN NEW;
    END IF;

    -- Calculate points: total EUR * points_per_euro
    v_points := FLOOR(NEW.total * v_settings.points_per_euro);
    
    IF v_points <= 0 THEN
      RETURN NEW;
    END IF;

    -- Get current balance
    v_balance := public.get_loyalty_balance(NEW.user_id, NEW.workspace_id);

    -- Insert transaction
    INSERT INTO public.loyalty_points_transactions (
      workspace_id, user_id, order_id, points, type, description, balance_after
    ) VALUES (
      NEW.workspace_id,
      NEW.user_id,
      NEW.id,
      v_points,
      'earned',
      'Pontos ganhos na encomenda #' || NEW.order_number,
      v_balance + v_points
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to store_orders
CREATE TRIGGER trigger_credit_loyalty_points
  AFTER UPDATE ON public.store_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_loyalty_points_on_paid();

-- Index for fast balance lookups
CREATE INDEX idx_loyalty_transactions_user_workspace 
  ON public.loyalty_points_transactions(user_id, workspace_id);

CREATE INDEX idx_loyalty_transactions_order 
  ON public.loyalty_points_transactions(order_id);

-- Timestamp trigger for loyalty_settings
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
