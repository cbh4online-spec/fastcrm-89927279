
ALTER TABLE public.workspace_template_stats
ADD COLUMN IF NOT EXISTS stage_progression_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS weighted_score NUMERIC DEFAULT 0;
