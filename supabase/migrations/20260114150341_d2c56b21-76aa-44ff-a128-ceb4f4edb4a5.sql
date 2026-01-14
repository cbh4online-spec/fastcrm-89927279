-- Create table for AI field suggestions
CREATE TABLE public.ai_field_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'opportunity', 'contact', 'company')),
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('standard', 'custom')),
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  suggested_value JSONB NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  source_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.ai_field_suggestions ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX idx_ai_field_suggestions_entity ON public.ai_field_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_field_suggestions_workspace ON public.ai_field_suggestions(workspace_id);
CREATE INDEX idx_ai_field_suggestions_status ON public.ai_field_suggestions(status);

-- RLS Policies
CREATE POLICY "Users can view suggestions in their workspace"
ON public.ai_field_suggestions
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create suggestions in their workspace"
ON public.ai_field_suggestions
FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update suggestions in their workspace"
ON public.ai_field_suggestions
FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete suggestions in their workspace"
ON public.ai_field_suggestions
FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id));