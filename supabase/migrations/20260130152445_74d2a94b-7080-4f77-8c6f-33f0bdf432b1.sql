-- Add company_id to marketing_recipients if not exists
ALTER TABLE public.marketing_recipients 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Add workspace_id to marketing_recipients if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketing_recipients' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.marketing_recipients ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
    
    -- Populate workspace_id from campaign
    UPDATE public.marketing_recipients mr
    SET workspace_id = mc.workspace_id
    FROM public.marketing_campaigns mc
    WHERE mr.campaign_id = mc.id AND mr.workspace_id IS NULL;
  END IF;
END $$;

-- Create function to increment campaign stats atomically
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(
  p_campaign_id uuid,
  p_field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.marketing_campaigns SET %I = COALESCE(%I, 0) + 1, updated_at = now() WHERE id = $1',
    p_field,
    p_field
  ) USING p_campaign_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text) TO service_role;