-- Allow created_by to be nullable for system/webhook-created records
ALTER TABLE public.leads ALTER COLUMN created_by DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN public.leads.created_by IS 'User ID who created the lead. NULL for system-created records (webhooks, integrations).';