-- Add missing base fields to opportunities table
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS ai_insight TEXT,
ADD COLUMN IF NOT EXISTS ai_next_action TEXT,
ADD COLUMN IF NOT EXISTS ai_temperature TEXT,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Add pipeline metadata fields
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS pipeline_id UUID;

-- Create pipelines table for multiple pipelines support
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'sales',
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- RLS policies for pipelines
CREATE POLICY "Users can view pipelines in their workspace"
ON public.pipelines FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create pipelines in their workspace"
ON public.pipelines FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update pipelines in their workspace"
ON public.pipelines FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete pipelines in their workspace"
ON public.pipelines FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Add pipeline_id foreign key to pipeline_stages (after creating pipelines table)
-- First, drop existing constraint if any and add new one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pipeline_stages_pipeline_id_fkey'
  ) THEN
    ALTER TABLE public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pipeline_id_fkey 
    FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_status ON public.opportunities(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id);

-- Update trigger for pipelines
CREATE OR REPLACE FUNCTION public.update_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pipelines_updated_at ON public.pipelines;
CREATE TRIGGER update_pipelines_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_pipelines_updated_at();