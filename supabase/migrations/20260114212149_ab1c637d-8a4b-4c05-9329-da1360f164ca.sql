-- Create proposal templates table
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  styles JSONB DEFAULT '{}'::jsonb,
  cta_text TEXT DEFAULT 'Aceitar Proposta',
  cta_color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.proposal_templates(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  styles JSONB DEFAULT '{}'::jsonb,
  cta_text TEXT DEFAULT 'Aceitar Proposta',
  cta_color TEXT DEFAULT '#3b82f6',
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'accepted', 'expired', 'rejected')),
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  views_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal versions table for versioning
CREATE TABLE public.proposal_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content_blocks JSONB NOT NULL,
  variables JSONB,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal activity logs
CREATE TABLE public.proposal_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on proposal slug per workspace
CREATE UNIQUE INDEX idx_proposals_workspace_slug ON public.proposals(workspace_id, slug);

-- Create index for opportunity lookup
CREATE INDEX idx_proposals_opportunity ON public.proposals(opportunity_id);

-- Create index for proposal versions
CREATE INDEX idx_proposal_versions_proposal ON public.proposal_versions(proposal_id, version DESC);

-- Enable RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_templates
CREATE POLICY "Workspace members can view proposal templates"
ON public.proposal_templates FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create proposal templates"
ON public.proposal_templates FOR INSERT
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update proposal templates"
ON public.proposal_templates FOR UPDATE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete proposal templates"
ON public.proposal_templates FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS policies for proposals
CREATE POLICY "Workspace members can view proposals"
ON public.proposals FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create proposals"
ON public.proposals FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update proposals"
ON public.proposals FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete proposals"
ON public.proposals FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS policies for proposal_versions
CREATE POLICY "Workspace members can view proposal versions"
ON public.proposal_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND public.is_workspace_member(auth.uid(), p.workspace_id)
  )
);

CREATE POLICY "Workspace members can create proposal versions"
ON public.proposal_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id
    AND public.is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- RLS policies for proposal_activity_logs
CREATE POLICY "Workspace members can view proposal activity"
ON public.proposal_activity_logs FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Anyone can create proposal activity logs"
ON public.proposal_activity_logs FOR INSERT
WITH CHECK (true);

-- Public access policy for published proposals (for public page viewing)
CREATE POLICY "Public can view published proposals by slug"
ON public.proposals FOR SELECT
USING (status = 'published');

-- Triggers for updated_at
CREATE TRIGGER update_proposal_templates_updated_at
BEFORE UPDATE ON public.proposal_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();