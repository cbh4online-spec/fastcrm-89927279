
-- ============================================================
-- FASE H: store_gift_card_reservations + new store_orders columns
-- ============================================================

-- 1. New table: store_gift_card_reservations
CREATE TABLE public.store_gift_card_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES public.store_gift_cards(id) ON DELETE CASCADE,
  store_order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  amount_reserved NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for reservations
CREATE INDEX idx_gc_reservations_session ON public.store_gift_card_reservations(stripe_session_id);
CREATE INDEX idx_gc_reservations_status ON public.store_gift_card_reservations(status) WHERE status = 'reserved';
CREATE INDEX idx_gc_reservations_gift_card ON public.store_gift_card_reservations(gift_card_id);

-- RLS: enable but allow service_role bypass; workspace members can SELECT
ALTER TABLE public.store_gift_card_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view gift card reservations"
  ON public.store_gift_card_reservations
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- 2. New columns on store_orders
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS gift_card_id UUID REFERENCES public.store_gift_cards(id),
  ADD COLUMN IF NOT EXISTS gift_card_reserved_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'store';

-- Index for source filtering
CREATE INDEX idx_store_orders_source ON public.store_orders(source);
