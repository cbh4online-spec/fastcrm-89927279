
-- ═══════════════════════════════════════════════════════════════
-- GRUPOS INTERNOS + TELEGRAM INFRASTRUCTURE
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela principal de grupos (internos e Telegram)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  
  -- Tipo de grupo
  group_type TEXT NOT NULL DEFAULT 'internal', -- 'internal' | 'telegram' | 'hybrid'
  purpose TEXT NOT NULL DEFAULT 'general', -- 'support' | 'sales' | 'community' | 'team' | 'general'
  
  -- Telegram linking
  telegram_chat_id BIGINT, -- Chat ID do grupo Telegram (se ligado)
  telegram_invite_link TEXT,
  
  -- Configurações
  settings JSONB DEFAULT '{
    "allowMemberInvite": false,
    "allowFileSharing": true,
    "allowProductSharing": true,
    "notificationsEnabled": true,
    "autoSyncTelegram": true
  }'::jsonb,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_groups_workspace ON public.groups(workspace_id);
CREATE INDEX idx_groups_type ON public.groups(workspace_id, group_type);
CREATE INDEX idx_groups_telegram ON public.groups(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.groups
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 2. Membros dos grupos
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Membro pode ser user interno, contacto ou lead
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Dados Telegram do membro (se aplicável)
  telegram_user_id BIGINT,
  telegram_username TEXT,
  
  role TEXT DEFAULT 'member', -- 'admin' | 'moderator' | 'member'
  
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT member_entity_check CHECK (
    (user_id IS NOT NULL)::int +
    (contact_id IS NOT NULL)::int +
    (lead_id IS NOT NULL)::int >= 1
  )
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_group_members_contact ON public.group_members(contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX idx_group_members_unique_user ON public.group_members(group_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_group_members_unique_contact ON public.group_members(group_id, contact_id) WHERE contact_id IS NOT NULL;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.group_members
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 3. Mensagens dos grupos
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Quem enviou
  sender_user_id UUID REFERENCES auth.users(id),
  sender_contact_id UUID REFERENCES public.contacts(id),
  sender_name TEXT, -- cache para exibição rápida
  
  -- Conteúdo
  content TEXT,
  content_type TEXT DEFAULT 'text', -- 'text' | 'image' | 'file' | 'product' | 'system'
  
  -- Produto partilhado
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Ficheiros
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Telegram sync
  telegram_message_id BIGINT,
  
  -- Metadata
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);
CREATE INDEX idx_group_messages_telegram ON public.group_messages(telegram_message_id) WHERE telegram_message_id IS NOT NULL;
CREATE INDEX idx_group_messages_product ON public.group_messages(product_id) WHERE product_id IS NOT NULL;

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.group_messages
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 4. Telegram bot state (para polling)
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.telegram_bot_state
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- 5. Telegram raw messages (log de updates recebidos)
CREATE TABLE public.telegram_messages (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  from_user_id BIGINT,
  from_username TEXT,
  text TEXT,
  raw_update JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat ON public.telegram_messages(chat_id);
CREATE INDEX idx_telegram_messages_processed ON public.telegram_messages(processed) WHERE processed = false;

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.telegram_messages
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 6. Configuração Telegram por workspace
CREATE TABLE public.telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_username TEXT,
  bot_name TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Configurações de notificação
  notify_new_leads BOOLEAN DEFAULT true,
  notify_new_deals BOOLEAN DEFAULT true,
  notify_proposals BOOLEAN DEFAULT true,
  notify_invoices BOOLEAN DEFAULT false,
  alert_group_chat_id BIGINT, -- Grupo para alertas da equipa
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.telegram_config
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Realtime para mensagens de grupo
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
