-- Add won_at column
ALTER TABLE public.opportunities ADD COLUMN won_at TIMESTAMPTZ;

-- Backfill existing won opportunities
UPDATE public.opportunities SET won_at = updated_at WHERE status = 'won' AND won_at IS NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.set_opportunity_won_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS DISTINCT FROM 'won') THEN
    NEW.won_at := NOW();
  ELSIF NEW.status IS DISTINCT FROM 'won' AND OLD.status = 'won' THEN
    NEW.won_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_set_opportunity_won_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_opportunity_won_at();