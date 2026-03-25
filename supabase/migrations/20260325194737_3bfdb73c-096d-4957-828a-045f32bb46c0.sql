
-- Add NIF column to account_brief_accounts
ALTER TABLE public.account_brief_accounts ADD COLUMN IF NOT EXISTS nif TEXT;

-- Create corporate data table
CREATE TABLE public.account_brief_corporate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  nif TEXT,
  shareholders JSONB DEFAULT '[]'::jsonb,
  managers JSONB DEFAULT '[]'::jsonb,
  annual_revenue JSONB DEFAULT '[]'::jsonb,
  capital_social TEXT,
  legal_nature TEXT,
  founding_date TEXT,
  company_status TEXT,
  source_url TEXT,
  extracted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.account_brief_corporate_data ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can view corporate data"
  ON public.account_brief_corporate_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = account_brief_corporate_data.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace members can insert
CREATE POLICY "Workspace members can insert corporate data"
  ON public.account_brief_corporate_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = account_brief_corporate_data.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- RLS: workspace members can update
CREATE POLICY "Workspace members can update corporate data"
  ON public.account_brief_corporate_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = account_brief_corporate_data.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Service role needs full access for edge functions
CREATE POLICY "Service role full access corporate data"
  ON public.account_brief_corporate_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
