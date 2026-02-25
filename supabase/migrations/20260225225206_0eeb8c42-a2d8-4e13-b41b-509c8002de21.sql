ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'visitor';

CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle_stage 
ON public.contacts(workspace_id, lifecycle_stage);