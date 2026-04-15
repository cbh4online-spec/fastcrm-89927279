
-- =============================================
-- TABELA: live_sessions
-- =============================================
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'scheduled',
  type text NOT NULL DEFAULT 'open',
  livekit_room_name text UNIQUE,
  livekit_room_sid text,
  viewer_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  thumbnail_url text
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "live_sessions_select_public"
  ON public.live_sessions FOR SELECT
  USING (true);

-- Escrita pelo seller
CREATE POLICY "live_sessions_insert_seller"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "live_sessions_update_seller"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "live_sessions_delete_seller"
  ON public.live_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Escrita por admin do workspace (via workspace_members)
CREATE POLICY "live_sessions_insert_ws_admin"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = live_sessions.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "live_sessions_update_ws_admin"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = live_sessions.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "live_sessions_delete_ws_admin"
  ON public.live_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = live_sessions.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

-- Índices
CREATE INDEX idx_live_sessions_workspace ON public.live_sessions(workspace_id);
CREATE INDEX idx_live_sessions_seller ON public.live_sessions(seller_id);
CREATE INDEX idx_live_sessions_status ON public.live_sessions(status);

-- =============================================
-- TABELA: live_products
-- =============================================
CREATE TABLE public.live_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  featured_at timestamptz,
  order_index integer NOT NULL DEFAULT 0
);

ALTER TABLE public.live_products ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "live_products_select_public"
  ON public.live_products FOR SELECT
  USING (true);

-- Escrita pelo seller da live
CREATE POLICY "live_products_insert_seller"
  ON public.live_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_products.live_session_id
        AND ls.seller_id = auth.uid()
    )
  );

CREATE POLICY "live_products_update_seller"
  ON public.live_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_products.live_session_id
        AND ls.seller_id = auth.uid()
    )
  );

CREATE POLICY "live_products_delete_seller"
  ON public.live_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_products.live_session_id
        AND ls.seller_id = auth.uid()
    )
  );

-- Unique constraint: apenas 1 featured por sessão
CREATE UNIQUE INDEX idx_live_products_one_featured
  ON public.live_products(live_session_id)
  WHERE is_featured = true;

CREATE INDEX idx_live_products_session ON public.live_products(live_session_id);

-- =============================================
-- TABELA: live_orders
-- =============================================
CREATE TABLE public.live_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_orders ENABLE ROW LEVEL SECURITY;

-- Leitura pelo buyer
CREATE POLICY "live_orders_select_buyer"
  ON public.live_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Leitura pelo seller da live
CREATE POLICY "live_orders_select_seller"
  ON public.live_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions ls
      WHERE ls.id = live_orders.live_session_id
        AND ls.seller_id = auth.uid()
    )
  );

-- Escrita pelo buyer
CREATE POLICY "live_orders_insert_buyer"
  ON public.live_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX idx_live_orders_session ON public.live_orders(live_session_id);
CREATE INDEX idx_live_orders_buyer ON public.live_orders(buyer_id);

-- =============================================
-- TABELA: live_chat_messages
-- =============================================
CREATE TABLE public.live_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "live_chat_messages_select_public"
  ON public.live_chat_messages FOR SELECT
  USING (true);

-- Escrita por utilizadores autenticados
CREATE POLICY "live_chat_messages_insert_auth"
  ON public.live_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_live_chat_session ON public.live_chat_messages(live_session_id);
CREATE INDEX idx_live_chat_created ON public.live_chat_messages(created_at);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
