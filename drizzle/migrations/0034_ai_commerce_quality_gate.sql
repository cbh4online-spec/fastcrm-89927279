-- Configuração do Quality Gate por workspace
CREATE TABLE IF NOT EXISTS public.ai_commerce_gate_config (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  min_score integer NOT NULL DEFAULT 60 CHECK (min_score >= 0 AND min_score <= 100),
  required_codes text[] NOT NULL DEFAULT ARRAY['name','price','currency','availability','main_image','short_description','category','brand','public_url']::text[],
  block_store boolean NOT NULL DEFAULT true,
  block_feeds boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_commerce_gate_config TO authenticated;
GRANT ALL ON public.ai_commerce_gate_config TO service_role;

ALTER TABLE public.ai_commerce_gate_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read gate config" ON public.ai_commerce_gate_config;
CREATE POLICY "Members read gate config" ON public.ai_commerce_gate_config
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Members insert gate config" ON public.ai_commerce_gate_config;
CREATE POLICY "Members insert gate config" ON public.ai_commerce_gate_config
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Members update gate config" ON public.ai_commerce_gate_config;
CREATE POLICY "Members update gate config" ON public.ai_commerce_gate_config
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Estado do gate por produto
ALTER TABLE public.product_ai_commerce
  ADD COLUMN IF NOT EXISTS gate_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS gate_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gate_score integer,
  ADD COLUMN IF NOT EXISTS gate_checked_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_ai_commerce_gate_status_check'
  ) THEN
    ALTER TABLE public.product_ai_commerce
      ADD CONSTRAINT product_ai_commerce_gate_status_check
      CHECK (gate_status IN ('pass','blocked','unknown'));
  END IF;
END $$;

-- Marca de bloqueio no produto: usada pelas consultas públicas da loja
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ai_commerce_gate_blocked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_gate_blocked
  ON public.products(workspace_id)
  WHERE ai_commerce_gate_blocked;

CREATE INDEX IF NOT EXISTS idx_product_ai_commerce_gate_status
  ON public.product_ai_commerce(workspace_id, gate_status);