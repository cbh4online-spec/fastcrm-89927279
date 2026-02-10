
-- Gift Cards table
CREATE TABLE public.store_gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  initial_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active',
  purchaser_name TEXT,
  purchaser_email TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  message TEXT,
  stripe_payment_intent_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gift Card Transactions table
CREATE TABLE public.store_gift_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID NOT NULL REFERENCES public.store_gift_cards(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id TEXT,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_gift_cards
-- Public read by code (for balance check)
CREATE POLICY "Anyone can read gift cards by code"
  ON public.store_gift_cards FOR SELECT
  USING (true);

-- Workspace members can insert (admin creates)
CREATE POLICY "Workspace members can create gift cards"
  ON public.store_gift_cards FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Workspace members can update (status, balance)
CREATE POLICY "Workspace members can update gift cards"
  ON public.store_gift_cards FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Workspace members can delete
CREATE POLICY "Workspace members can delete gift cards"
  ON public.store_gift_cards FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS Policies for store_gift_card_transactions
CREATE POLICY "Anyone can read gift card transactions"
  ON public.store_gift_card_transactions FOR SELECT
  USING (true);

CREATE POLICY "Workspace members can create gift card transactions"
  ON public.store_gift_card_transactions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_store_gift_cards_workspace ON public.store_gift_cards(workspace_id);
CREATE INDEX idx_store_gift_cards_code ON public.store_gift_cards(code);
CREATE INDEX idx_store_gift_cards_status ON public.store_gift_cards(status);
CREATE INDEX idx_store_gift_card_transactions_gift_card ON public.store_gift_card_transactions(gift_card_id);

-- Updated_at trigger
CREATE TRIGGER update_store_gift_cards_updated_at
  BEFORE UPDATE ON public.store_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
