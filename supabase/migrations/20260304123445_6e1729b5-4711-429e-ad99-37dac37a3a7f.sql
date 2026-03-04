
-- Create rfq_awards table
CREATE TABLE public.rfq_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awarded', 'converted_to_po')),
  strategy text NOT NULL DEFAULT 'best_per_item' CHECK (strategy IN ('best_per_item', 'single_supplier', 'weighted_best_value', 'fastest_delivery', 'lowest_total_cost')),
  weights_json jsonb DEFAULT '{"price": 45, "lead_time": 25, "moq": 15, "preference": 10, "quality": 5}'::jsonb,
  analysis_json jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create rfq_award_items table
CREATE TABLE public.rfq_award_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  award_id uuid NOT NULL REFERENCES public.rfq_awards(id) ON DELETE CASCADE,
  rfq_item_id uuid NOT NULL REFERENCES public.rfq_items(id) ON DELETE CASCADE,
  selected_supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  selected_quote_id uuid REFERENCES public.rfq_quotes(id),
  selected_qty numeric NOT NULL DEFAULT 0,
  rationale_text text,
  score_json jsonb,
  rank_alternatives jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfq_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_award_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for rfq_awards
CREATE POLICY "Users can view awards in their workspace" ON public.rfq_awards
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert awards in their workspace" ON public.rfq_awards
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update awards in their workspace" ON public.rfq_awards
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS policies for rfq_award_items
CREATE POLICY "Users can view award items in their workspace" ON public.rfq_award_items
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert award items in their workspace" ON public.rfq_award_items
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update award items in their workspace" ON public.rfq_award_items
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
