
-- 1. Function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title AND NEW.slug = OLD.slug) THEN
    base_slug := lower(regexp_replace(
      regexp_replace(
        translate(NEW.title, 'áàãâéèêíìîóòõôúùûçñÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇÑ', 'aaaaeeeiiioooouuucnAAAAEEEIIIOOOOUUUCN'),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    ));
    final_slug := base_slug;
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.hr_job_postings 
        WHERE slug = final_slug AND workspace_id = NEW.workspace_id AND id != NEW.id
      ) THEN
        EXIT;
      END IF;
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger
DROP TRIGGER IF EXISTS trg_generate_job_slug ON public.hr_job_postings;
CREATE TRIGGER trg_generate_job_slug
  BEFORE INSERT OR UPDATE ON public.hr_job_postings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_slug();

-- 3. Public RLS policy for reading active jobs (anonymous)
CREATE POLICY "Public can view active job postings"
  ON public.hr_job_postings
  FOR SELECT
  TO anon
  USING (status = 'active' AND published_at IS NOT NULL);

-- 4. Public RLS policy for inserting candidates (anonymous applications)
CREATE POLICY "Public can apply to jobs"
  ON public.hr_candidates
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_job_postings
      WHERE id = job_posting_id AND status = 'active' AND published_at IS NOT NULL
    )
  );

-- 5. Public read on workspaces for branding (limited columns via app)
CREATE POLICY "Public can read workspace branding"
  ON public.workspaces
  FOR SELECT
  TO anon
  USING (true);

-- 6. Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-cvs', 'hr-cvs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies for CV uploads
CREATE POLICY "Anyone can upload CVs"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'hr-cvs');

CREATE POLICY "Anyone can read CVs"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'hr-cvs');

-- 8. Update existing jobs to have slugs
UPDATE public.hr_job_postings SET slug = slug WHERE slug IS NULL;
