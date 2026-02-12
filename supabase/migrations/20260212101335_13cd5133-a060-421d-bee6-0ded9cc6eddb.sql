
-- Membership tier na community_members
ALTER TABLE public.community_members 
  ADD COLUMN membership_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN is_crm_verified boolean NOT NULL DEFAULT false;

-- Tabela de agregados do CRM (context bridge)
CREATE TABLE public.fastclub_crm_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  metric_key text NOT NULL,
  metric_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, metric_key)
);

ALTER TABLE public.fastclub_crm_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read aggregates"
  ON public.fastclub_crm_aggregates FOR SELECT
  TO authenticated USING (true);

-- Tabela de conteudo das seccoes
CREATE TABLE public.fastclub_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  page_key text NOT NULL,
  section_key text NOT NULL,
  title text,
  content text,
  media_url text,
  media_type text DEFAULT 'image',
  sort_order int DEFAULT 0,
  is_premium boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fastclub_content_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read content"
  ON public.fastclub_content_sections FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage content"
  ON public.fastclub_content_sections FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = fastclub_content_sections.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Tabela do Desafio 7 Dias (estrutura para Fase 2)
CREATE TABLE public.fastclub_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  day_number int NOT NULL,
  title text NOT NULL,
  description text,
  action_label text,
  action_url text,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fastclub_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read challenges"
  ON public.fastclub_challenges FOR SELECT
  TO authenticated USING (true);
