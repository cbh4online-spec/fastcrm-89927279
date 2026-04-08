
-- Add short_code column to ebooks
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS short_code text UNIQUE;

-- Create function to auto-generate short_code
CREATE OR REPLACE FUNCTION public.generate_ebook_short_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  collision boolean;
BEGIN
  IF NEW.short_code IS NULL THEN
    LOOP
      new_code := substr(md5(gen_random_uuid()::text), 1, 6);
      SELECT EXISTS(SELECT 1 FROM public.ebooks WHERE short_code = new_code) INTO collision;
      EXIT WHEN NOT collision;
    END LOOP;
    NEW.short_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS trg_ebook_short_code ON public.ebooks;
CREATE TRIGGER trg_ebook_short_code
  BEFORE INSERT ON public.ebooks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ebook_short_code();

-- Backfill existing ebooks without short_code
UPDATE public.ebooks
SET short_code = substr(md5(id || now()::text), 1, 6)
WHERE short_code IS NULL;
