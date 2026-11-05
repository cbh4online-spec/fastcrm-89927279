ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_related_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_related_type_check
  CHECK (related_type = ANY (ARRAY['lead','opportunity','context_block','contact','company']::text[]));