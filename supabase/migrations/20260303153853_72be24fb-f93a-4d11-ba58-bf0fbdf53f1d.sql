
-- Function to auto-generate rfq_number on INSERT
CREATE OR REPLACE FUNCTION public.generate_rfq_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  seq_num INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    NULLIF(SUBSTRING(rfq_number FROM 'RFQ-' || current_year || '-(\d+)'), '')::INTEGER
  ), 0) + 1
  INTO seq_num
  FROM public.rfqs
  WHERE workspace_id = NEW.workspace_id
    AND rfq_number LIKE 'RFQ-' || current_year || '-%';

  NEW.rfq_number := 'RFQ-' || current_year || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger on rfqs table
CREATE TRIGGER trg_generate_rfq_number
  BEFORE INSERT ON public.rfqs
  FOR EACH ROW
  WHEN (NEW.rfq_number IS NULL)
  EXECUTE FUNCTION public.generate_rfq_number();

-- Backfill existing RFQs that have NULL rfq_number
DO $$
DECLARE
  r RECORD;
  current_year TEXT;
  seq_num INTEGER;
BEGIN
  FOR r IN
    SELECT id, workspace_id, created_at
    FROM public.rfqs
    WHERE rfq_number IS NULL
    ORDER BY created_at ASC
  LOOP
    current_year := EXTRACT(YEAR FROM r.created_at)::TEXT;
    
    SELECT COALESCE(MAX(
      NULLIF(SUBSTRING(rfq_number FROM 'RFQ-' || current_year || '-(\d+)'), '')::INTEGER
    ), 0) + 1
    INTO seq_num
    FROM public.rfqs
    WHERE workspace_id = r.workspace_id
      AND rfq_number LIKE 'RFQ-' || current_year || '-%';

    UPDATE public.rfqs
    SET rfq_number = 'RFQ-' || current_year || '-' || LPAD(seq_num::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;
