
-- Function to generate random alphanumeric short code
CREATE OR REPLACE FUNCTION public.generate_short_code(length integer DEFAULT 6)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add short_code column
ALTER TABLE public.bio_pages
ADD COLUMN short_code varchar(8) UNIQUE;

-- Backfill existing records
UPDATE public.bio_pages
SET short_code = public.generate_short_code(6)
WHERE short_code IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE public.bio_pages
ALTER COLUMN short_code SET NOT NULL,
ALTER COLUMN short_code SET DEFAULT public.generate_short_code(6);
