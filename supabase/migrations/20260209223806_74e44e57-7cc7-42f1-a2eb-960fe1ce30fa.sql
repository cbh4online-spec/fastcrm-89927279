
-- 1. Add CRM association columns to store_orders
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id);
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.marketing_campaigns(id);
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. Create store_order_events table
CREATE TABLE public.store_order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  description text NOT NULL DEFAULT '',
  metadata jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_order_events_order_id ON public.store_order_events(order_id);
CREATE INDEX idx_store_order_events_workspace_id ON public.store_order_events(workspace_id);

-- 3. Enable RLS
ALTER TABLE public.store_order_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for store_order_events (workspace members only)
CREATE POLICY "Workspace members can view store order events"
  ON public.store_order_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert store order events"
  ON public.store_order_events FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- 5. Trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION public.store_order_status_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.store_order_events (order_id, workspace_id, event_type, from_status, to_status, description, created_by)
    VALUES (
      NEW.id,
      NEW.workspace_id,
      'status_change',
      OLD.status,
      NEW.status,
      'Estado alterado de ' || COALESCE(OLD.status, 'n/a') || ' para ' || NEW.status,
      auth.uid()
    );
  END IF;

  -- Update lifecycle timestamps
  IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
    NEW.shipped_at = now();
  END IF;
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.completed_at = now();
  END IF;
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    NEW.refunded_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger
CREATE TRIGGER store_order_status_change
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.store_order_status_change_trigger();
