-- Add customer/company association to price tables
ALTER TABLE public.price_tables 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS min_order_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS margin_adjustment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_optimization_notes TEXT;

-- Add more fields to price_table_items for better tracking
ALTER TABLE public.price_table_items
ADD COLUMN IF NOT EXISTS original_price NUMERIC,
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC,
ADD COLUMN IF NOT EXISTS ai_suggested_price NUMERIC,
ADD COLUMN IF NOT EXISTS ai_suggestion_reason TEXT,
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_quantity INTEGER;

-- Create table for price table assignments to specific clients
CREATE TABLE IF NOT EXISTS public.price_table_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(price_table_id, contact_id),
  UNIQUE(price_table_id, company_id)
);

-- Create table for AI pricing suggestions log
CREATE TABLE IF NOT EXISTS public.price_optimization_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_table_id UUID REFERENCES public.price_tables(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  original_price NUMERIC NOT NULL,
  suggested_price NUMERIC NOT NULL,
  margin_change NUMERIC,
  optimization_type TEXT NOT NULL, -- 'competitive', 'margin', 'volume', 'customer_fit'
  reasoning TEXT,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_optimization_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_table_assignments
CREATE POLICY "Users can view price table assignments in their workspace"
ON public.price_table_assignments FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert price table assignments in their workspace"
ON public.price_table_assignments FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update price table assignments in their workspace"
ON public.price_table_assignments FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete price table assignments in their workspace"
ON public.price_table_assignments FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- RLS policies for price_optimization_logs
CREATE POLICY "Users can view price optimization logs in their workspace"
ON public.price_optimization_logs FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert price optimization logs in their workspace"
ON public.price_optimization_logs FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_table_assignments_contact ON public.price_table_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_price_table_assignments_company ON public.price_table_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_price_optimization_logs_table ON public.price_optimization_logs(price_table_id);

-- Trigger for updated_at
CREATE TRIGGER update_price_table_assignments_updated_at
BEFORE UPDATE ON public.price_table_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();