-- Create product_types table for customizable product types
CREATE TABLE public.product_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Package',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- Create billing_types table for customizable billing options
CREATE TABLE public.billing_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  frequency TEXT, -- monthly, quarterly, yearly, etc.
  icon TEXT DEFAULT 'CreditCard',
  color TEXT DEFAULT '#10B981',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- Enable RLS
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_types
CREATE POLICY "Users can view product types in their workspace"
ON public.product_types FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert product types in their workspace"
ON public.product_types FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update product types in their workspace"
ON public.product_types FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete non-system product types in their workspace"
ON public.product_types FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
) AND is_system = false);

-- RLS Policies for billing_types
CREATE POLICY "Users can view billing types in their workspace"
ON public.billing_types FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert billing types in their workspace"
ON public.billing_types FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update billing types in their workspace"
ON public.billing_types FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete non-system billing types in their workspace"
ON public.billing_types FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
) AND is_system = false);

-- Create trigger for updated_at
CREATE TRIGGER update_product_types_updated_at
BEFORE UPDATE ON public.product_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_types_updated_at
BEFORE UPDATE ON public.billing_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();