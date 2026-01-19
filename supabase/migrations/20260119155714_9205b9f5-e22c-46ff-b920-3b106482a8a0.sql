-- Create sales_goals table for monthly targets
CREATE TABLE public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  leads_target INTEGER NOT NULL DEFAULT 0,
  proposals_target INTEGER NOT NULL DEFAULT 0,
  opportunities_target INTEGER NOT NULL DEFAULT 0,
  revenue_target NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, month)
);

-- Enable RLS
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view goals in their workspace"
ON public.sales_goals FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create goals in their workspace"
ON public.sales_goals FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update goals in their workspace"
ON public.sales_goals FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete goals in their workspace"
ON public.sales_goals FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_sales_goals_updated_at
BEFORE UPDATE ON public.sales_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();