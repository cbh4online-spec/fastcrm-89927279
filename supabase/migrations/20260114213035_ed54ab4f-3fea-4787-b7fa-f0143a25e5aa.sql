-- Add new automation trigger: proposal_paid
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'proposal_paid';

-- Add new automation action types
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'create_proposal';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_proposal_link';

-- Create proposal analytics table
CREATE TABLE public.proposal_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.proposal_templates(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'checkout_started', 'payment_completed', 'payment_failed', 'expired', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for analytics queries
CREATE INDEX idx_proposal_analytics_workspace ON public.proposal_analytics(workspace_id);
CREATE INDEX idx_proposal_analytics_proposal ON public.proposal_analytics(proposal_id);
CREATE INDEX idx_proposal_analytics_template ON public.proposal_analytics(template_id);
CREATE INDEX idx_proposal_analytics_event ON public.proposal_analytics(event_type);
CREATE INDEX idx_proposal_analytics_created ON public.proposal_analytics(created_at);

-- Enable RLS
ALTER TABLE public.proposal_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_analytics
CREATE POLICY "Workspace members can view proposal analytics"
ON public.proposal_analytics FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert analytics"
ON public.proposal_analytics FOR INSERT
WITH CHECK (true);

-- Add payment_idempotency_key to proposals for idempotent payment handling
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS payment_idempotency_key TEXT UNIQUE;