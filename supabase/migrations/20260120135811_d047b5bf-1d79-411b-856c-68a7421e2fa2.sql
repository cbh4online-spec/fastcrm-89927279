-- Add deliverability settings to marketing_settings
ALTER TABLE public.marketing_settings
ADD COLUMN IF NOT EXISTS daily_email_limit integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS daily_campaigns_limit integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS warmup_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS warmup_days_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS warmup_started_at timestamptz,
ADD COLUMN IF NOT EXISTS kill_switch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kill_switch_reason text,
ADD COLUMN IF NOT EXISTS health_score numeric(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS bounce_rate numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS complaint_rate numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_health_check timestamptz;

-- Add tenant health tracking table
CREATE TABLE IF NOT EXISTS public.marketing_tenant_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_bounced integer DEFAULT 0,
  total_complained integer DEFAULT 0,
  hard_bounces integer DEFAULT 0,
  soft_bounces integer DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0.00,
  complaint_rate numeric(5,4) DEFAULT 0.0000,
  health_score numeric(5,2) DEFAULT 100.00,
  alerts_triggered jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, check_date)
);

-- Enable RLS
ALTER TABLE public.marketing_tenant_health ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant health
CREATE POLICY "Users can view their workspace tenant health"
  ON public.marketing_tenant_health FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_tenant_health.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Add tracking fields to marketing_recipients if not exists
ALTER TABLE public.marketing_recipients
ADD COLUMN IF NOT EXISTS bounce_type text,
ADD COLUMN IF NOT EXISTS bounce_code text;

-- Create index for health monitoring
CREATE INDEX IF NOT EXISTS idx_marketing_tenant_health_workspace_date
  ON public.marketing_tenant_health(workspace_id, check_date DESC);

-- Add campaign AI insights tracking
ALTER TABLE public.marketing_campaigns
ADD COLUMN IF NOT EXISTS ai_insights jsonb,
ADD COLUMN IF NOT EXISTS ai_insights_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS send_hour integer,
ADD COLUMN IF NOT EXISTS link_count integer DEFAULT 0;