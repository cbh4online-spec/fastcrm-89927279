-- =============================================
-- CRM DATA MODEL COMPLETION
-- =============================================

-- 1) ADD MISSING FIELDS TO LEADS
-- =============================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS external_instagram_id text,
ADD COLUMN IF NOT EXISTS external_whatsapp_id text,
ADD COLUMN IF NOT EXISTS external_email text,
ADD COLUMN IF NOT EXISTS external_username text;

-- Create indexes for external IDs (for lookups)
CREATE INDEX IF NOT EXISTS idx_leads_external_instagram_id ON public.leads(external_instagram_id) WHERE external_instagram_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_external_whatsapp_id ON public.leads(external_whatsapp_id) WHERE external_whatsapp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN(tags);

-- 2) ADD MISSING FIELD TO MESSAGES
-- =============================================
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS external_message_id text;

CREATE INDEX IF NOT EXISTS idx_messages_external_message_id ON public.messages(external_message_id) WHERE external_message_id IS NOT NULL;

-- 3) ADD MISSING FIELDS TO OPPORTUNITIES
-- =============================================
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS expected_close_date date,
ADD COLUMN IF NOT EXISTS lost_reason text,
ADD COLUMN IF NOT EXISTS notes text;

-- 4) CREATE TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  related_type text NOT NULL CHECK (related_type IN ('lead', 'opportunity')),
  related_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamp with time zone,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON public.tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update tasks" ON public.tasks
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete tasks" ON public.tasks
  FOR DELETE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) CREATE PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  stripe_payment_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_workspace_id ON public.payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_opportunity_id ON public.payments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON public.payments(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Members can view payments" ON public.payments
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create payments" ON public.payments
  FOR INSERT WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));