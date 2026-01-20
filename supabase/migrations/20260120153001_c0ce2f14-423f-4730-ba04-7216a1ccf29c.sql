-- Add labor/service time tracking fields to products (if not exist)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_hourly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS labor_included_in_price BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS labor_notes TEXT;

-- Create workspace labor rates configuration table
CREATE TABLE workspace_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE workspace_labor_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_labor_rates
CREATE POLICY "labor_rates_select" ON workspace_labor_rates FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "labor_rates_insert" ON workspace_labor_rates FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "labor_rates_update" ON workspace_labor_rates FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "labor_rates_delete" ON workspace_labor_rates FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));