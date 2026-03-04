
-- Enum for block types
CREATE TYPE public.context_block_type AS ENUM (
  'strategy', 'business_model', 'offers', 'team',
  'goals', 'financials', 'priorities', 'processes'
);

CREATE TYPE public.context_block_status AS ENUM ('draft', 'approved');

-- Main blocks table
CREATE TABLE public.context_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type context_block_type NOT NULL,
  title TEXT NOT NULL,
  rich_text TEXT,
  status context_block_status DEFAULT 'draft',
  score INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, block_type)
);

-- Structured fields per block
CREATE TABLE public.context_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_value JSONB,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(block_id, field_key)
);

-- RLS
ALTER TABLE public.context_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_fields ENABLE ROW LEVEL SECURITY;

-- context_blocks policies
CREATE POLICY "context_blocks_select" ON public.context_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = context_blocks.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_blocks_insert" ON public.context_blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = context_blocks.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_blocks_update" ON public.context_blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = context_blocks.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_blocks_delete" ON public.context_blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = context_blocks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- context_fields policies
CREATE POLICY "context_fields_select" ON public.context_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.context_blocks cb JOIN public.workspace_members wm ON wm.workspace_id = cb.workspace_id WHERE cb.id = context_fields.block_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_fields_insert" ON public.context_fields FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.context_blocks cb JOIN public.workspace_members wm ON wm.workspace_id = cb.workspace_id WHERE cb.id = context_fields.block_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_fields_update" ON public.context_fields FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.context_blocks cb JOIN public.workspace_members wm ON wm.workspace_id = cb.workspace_id WHERE cb.id = context_fields.block_id AND wm.user_id = auth.uid())
);

CREATE POLICY "context_fields_delete" ON public.context_fields FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.context_blocks cb JOIN public.workspace_members wm ON wm.workspace_id = cb.workspace_id WHERE cb.id = context_fields.block_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- Seed function
CREATE OR REPLACE FUNCTION public.seed_context_blocks(p_workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Strategy
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'strategy', 'Strategy', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'vision', 'text', 1),
      (v_block_id, 'mission', 'text', 2),
      (v_block_id, 'competitive_advantage', 'text', 3),
      (v_block_id, 'market_position', 'text', 4),
      (v_block_id, 'key_differentiators', 'list', 5);
  END IF;

  -- Business Model
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'business_model', 'Business Model', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'model_type', 'text', 1),
      (v_block_id, 'description', 'text', 2),
      (v_block_id, 'revenue_streams', 'list', 3),
      (v_block_id, 'cost_structure', 'text', 4);
  END IF;

  -- Offers
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'offers', 'Offers', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'products', 'json', 1),
      (v_block_id, 'pricing_model', 'text', 2),
      (v_block_id, 'average_ticket', 'currency', 3),
      (v_block_id, 'upsell_strategy', 'text', 4);
  END IF;

  -- Team
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'team', 'Team', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'team_size', 'number', 1),
      (v_block_id, 'roles', 'list', 2),
      (v_block_id, 'strategies', 'list', 3),
      (v_block_id, 'hiring_plan', 'text', 4);
  END IF;

  -- Goals
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'goals', 'Goals', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'monthly_target', 'currency', 1),
      (v_block_id, 'quarterly_target', 'currency', 2),
      (v_block_id, 'annual_target', 'currency', 3),
      (v_block_id, 'deals_monthly', 'number', 4),
      (v_block_id, 'conversion_rate', 'number', 5);
  END IF;

  -- Financials
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'financials', 'Financials', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'mrr', 'currency', 1),
      (v_block_id, 'arr', 'currency', 2),
      (v_block_id, 'cac', 'currency', 3),
      (v_block_id, 'ltv', 'currency', 4),
      (v_block_id, 'churn_rate', 'number', 5),
      (v_block_id, 'margin', 'number', 6);
  END IF;

  -- Priorities
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'priorities', 'Priorities', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'current_quarter', 'list', 1),
      (v_block_id, 'next_quarter', 'list', 2),
      (v_block_id, 'blockers', 'list', 3),
      (v_block_id, 'initiatives', 'json', 4);
  END IF;

  -- Processes
  v_block_id := NULL;
  INSERT INTO context_blocks (workspace_id, block_type, title, created_by) VALUES (p_workspace_id, 'processes', 'Processes', v_user_id) ON CONFLICT DO NOTHING RETURNING id INTO v_block_id;
  IF v_block_id IS NOT NULL THEN
    INSERT INTO context_fields (block_id, field_key, field_type, display_order) VALUES
      (v_block_id, 'sales_steps', 'list', 1),
      (v_block_id, 'sales_cycle_days', 'number', 2),
      (v_block_id, 'follow_up_sla', 'number', 3),
      (v_block_id, 'objections', 'list', 4),
      (v_block_id, 'scripts', 'json', 5);
  END IF;
END;
$$;
