
ALTER TABLE public.vertical_templates
ADD COLUMN IF NOT EXISTS testimonials jsonb;

ALTER TABLE public.vertical_templates
ADD COLUMN IF NOT EXISTS video_section jsonb;
