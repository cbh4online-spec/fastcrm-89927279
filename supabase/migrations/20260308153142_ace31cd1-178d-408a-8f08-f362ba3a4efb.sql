
-- Add AI Revenue Engine columns to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS estimated_arr NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buying_signal TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_probability NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_growth_stage TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_revenue_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create deal_ai_insights table
CREATE TABLE IF NOT EXISTS public.deal_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_health_score NUMERIC DEFAULT 0,
  risk_signals JSONB DEFAULT '[]'::jsonb,
  stakeholder_map JSONB DEFAULT '[]'::jsonb,
  closing_probability NUMERIC DEFAULT 0,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  timeline_prediction JSONB DEFAULT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

-- Enable RLS
ALTER TABLE public.deal_ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_ai_insights
CREATE POLICY "Users can view deal insights in their workspace" 
  ON public.deal_ai_insights FOR SELECT TO authenticated 
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert deal insights in their workspace" 
  ON public.deal_ai_insights FOR INSERT TO authenticated 
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can update deal insights in their workspace" 
  ON public.deal_ai_insights FOR UPDATE TO authenticated 
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));
