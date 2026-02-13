-- Add new columns for Templates 2.0
ALTER TABLE public.communication_templates
  ADD COLUMN IF NOT EXISTS structure_type TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS cta TEXT,
  ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0;

-- Create trigger to increment conversion_count when template_usage_log is marked as converted
CREATE OR REPLACE FUNCTION public.increment_template_conversion_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.converted = true AND (OLD.converted IS NULL OR OLD.converted = false) THEN
    UPDATE public.communication_templates
    SET conversion_count = conversion_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_increment_template_conversion
AFTER UPDATE ON public.template_usage_logs
FOR EACH ROW
WHEN (NEW.converted = true AND (OLD.converted IS NULL OR OLD.converted = false))
EXECUTE FUNCTION public.increment_template_conversion_count();