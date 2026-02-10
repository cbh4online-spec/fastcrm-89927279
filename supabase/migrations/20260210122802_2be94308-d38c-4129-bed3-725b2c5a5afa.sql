
-- 1. Product Variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_override NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  attributes JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view product variants" ON public.product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = product_variants.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can manage product variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = product_variants.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
  );

CREATE POLICY "Public can view active variants" ON public.product_variants
  FOR SELECT USING (is_active = true);

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_workspace ON public.product_variants(workspace_id);

-- 2. Admin Notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = admin_notifications.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can update notifications" ON public.admin_notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = admin_notifications.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "System can insert notifications" ON public.admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_admin_notifications_workspace ON public.admin_notifications(workspace_id, is_read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- 3. Trigger: notify new paid order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('paid', 'processing') AND (OLD IS NULL OR OLD.status NOT IN ('paid', 'processing')) THEN
    INSERT INTO public.admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id, 'new_order', 'Nova encomenda paga',
      'Encomenda #' || COALESCE(NEW.order_number, NEW.id::text) || ' de ' || COALESCE(NEW.customer_name, NEW.customer_email) || ' - €' || COALESCE(NEW.total::text, '0'),
      jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'total', NEW.total)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT OR UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

-- 4. Trigger: notify low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_stock = true AND NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= COALESCE(NEW.low_stock_threshold, 5) AND NEW.stock_quantity > 0
     AND (OLD IS NULL OR OLD.stock_quantity > COALESCE(OLD.low_stock_threshold, 5)) THEN
    INSERT INTO public.admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id, 'low_stock', 'Stock baixo',
      NEW.name || ' tem apenas ' || NEW.stock_quantity || ' unidades em stock',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name, 'stock_quantity', NEW.stock_quantity)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_low_stock
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();
