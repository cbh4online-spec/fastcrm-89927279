-- ========================================
-- AI Matching Engine - Database Migration
-- ========================================

-- 1) Add fields to sj_courses for matching algorithm
ALTER TABLE public.sj_courses 
ADD COLUMN IF NOT EXISTS level text DEFAULT 'foundation',
ADD COLUMN IF NOT EXISTS prerequisites jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_for jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS next_courses jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS urgency_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_hours integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.sj_courses.level IS 'Course difficulty level: foundation, intermediate, advanced, expert';
COMMENT ON COLUMN public.sj_courses.prerequisites IS 'JSON array of {course_id, min_level} required before taking this course';
COMMENT ON COLUMN public.sj_courses.recommended_for IS 'JSON array of roles/profiles this course is ideal for';
COMMENT ON COLUMN public.sj_courses.next_courses IS 'JSON array of course_ids that follow this one in progression';
COMMENT ON COLUMN public.sj_courses.urgency_score IS 'Score 0-10 based on availability, upcoming dates, etc.';

-- 2) Create sj_course_recommendations table
CREATE TABLE IF NOT EXISTS public.sj_course_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.sj_profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.sj_courses(id) ON DELETE CASCADE,
  match_score integer NOT NULL DEFAULT 0,
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_breakdown jsonb DEFAULT '{}'::jsonb,
  recommended_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'new',
  dismissed_reason text,
  dismissed_at timestamp with time zone,
  contacted_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_by text NOT NULL DEFAULT 'ai',
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sj_recommendations_workspace ON public.sj_course_recommendations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_recommendations_profile ON public.sj_course_recommendations(profile_id);
CREATE INDEX IF NOT EXISTS idx_sj_recommendations_status ON public.sj_course_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_sj_recommendations_score ON public.sj_course_recommendations(match_score DESC);

-- Enable RLS
ALTER TABLE public.sj_course_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies using workspace_members
CREATE POLICY "sj_recommendations_select" 
ON public.sj_course_recommendations 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "sj_recommendations_insert" 
ON public.sj_course_recommendations 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "sj_recommendations_update" 
ON public.sj_course_recommendations 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "sj_recommendations_delete" 
ON public.sj_course_recommendations 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_sj_course_recommendations_updated_at
BEFORE UPDATE ON public.sj_course_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Add profile level field for gate checking
ALTER TABLE public.sj_profiles 
ADD COLUMN IF NOT EXISTS current_level text DEFAULT 'foundation',
ADD COLUMN IF NOT EXISTS role text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recommendations_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.sj_profiles.current_level IS 'Student current skill level: foundation, intermediate, advanced, expert';
COMMENT ON COLUMN public.sj_profiles.role IS 'Professional role/profile for matching';
COMMENT ON COLUMN public.sj_profiles.recommendations_enabled IS 'Whether AI recommendations are enabled for this profile';