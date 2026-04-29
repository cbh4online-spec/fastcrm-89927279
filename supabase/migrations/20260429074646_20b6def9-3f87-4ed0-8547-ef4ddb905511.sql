-- ============================================
-- 1. NEW TABLE: module_presentations (groups of slides per tier)
-- ============================================
CREATE TABLE IF NOT EXISTS public.module_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'welcome'
    CHECK (tier IN ('welcome', 'intermediate', 'advanced')),
  lang TEXT NOT NULL DEFAULT 'pt',
  title TEXT NOT NULL,
  description TEXT,
  unlock_after_days INTEGER NOT NULL DEFAULT 0,
  min_score_percent INTEGER NOT NULL DEFAULT 70
    CHECK (min_score_percent BETWEEN 0 AND 100),
  xp_reward INTEGER NOT NULL DEFAULT 50,
  allow_live_mode BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_slug, tier, lang)
);

CREATE INDEX IF NOT EXISTS idx_mp_module_tier
  ON public.module_presentations(module_slug, tier, lang)
  WHERE is_active = true;

ALTER TABLE public.module_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active presentations"
  ON public.module_presentations FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage presentations"
  ON public.module_presentations FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_module_presentations_updated_at
  BEFORE UPDATE ON public.module_presentations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. LINK SLIDES TO PRESENTATIONS (optional)
-- ============================================
ALTER TABLE public.module_onboarding_presentations
  ADD COLUMN IF NOT EXISTS presentation_id UUID REFERENCES public.module_presentations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slides_presentation
  ON public.module_onboarding_presentations(presentation_id, slide_order)
  WHERE is_active = true;

-- ============================================
-- 3. MODULE QUIZZES
-- ============================================
CREATE TABLE IF NOT EXISTS public.module_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.module_presentations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_quizzes_presentation
  ON public.module_quizzes(presentation_id, order_index)
  WHERE is_active = true;

ALTER TABLE public.module_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active quizzes"
  ON public.module_quizzes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins manage quizzes"
  ON public.module_quizzes FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_module_quizzes_updated_at
  BEFORE UPDATE ON public.module_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. QUIZ ATTEMPTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.module_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  presentation_id UUID NOT NULL REFERENCES public.module_presentations(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
  ON public.module_quiz_attempts(user_id, workspace_id, presentation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_workspace
  ON public.module_quiz_attempts(workspace_id, module_slug, created_at DESC);

ALTER TABLE public.module_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attempts or admins view team"
  ON public.module_quiz_attempts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = module_quiz_attempts.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users insert own attempts"
  ON public.module_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = module_quiz_attempts.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. USER PROGRESSION (XP + LEVELS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 10),
  modules_completed INTEGER NOT NULL DEFAULT 0,
  quizzes_passed INTEGER NOT NULL DEFAULT 0,
  badges_earned INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progression_workspace
  ON public.user_progression(workspace_id, total_xp DESC);

ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view progression"
  ON public.user_progression FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = user_progression.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages progression"
  ON public.user_progression FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_user_progression_updated_at
  BEFORE UPDATE ON public.user_progression
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. XP EVENTS (AUDIT)
-- ============================================
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'module_completed', 'quiz_passed', 'badge_earned', 'level_up', 'manual_grant'
  )),
  xp_amount INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user
  ON public.xp_events(user_id, workspace_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view xp events scoped"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = xp_events.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 7. BADGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Award',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  category TEXT NOT NULL DEFAULT 'achievement',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  module_slug TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active badges"
  ON public.badge_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins manage badges"
  ON public.badge_definitions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_badge_definitions_updated_at
  BEFORE UPDATE ON public.badge_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_workspace
  ON public.user_badges(workspace_id, earned_at DESC);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = user_badges.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role grants badges"
  ON public.user_badges FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- 8. LEVEL CALCULATION
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE
    WHEN _xp >= 7500 THEN 10
    WHEN _xp >= 5500 THEN 9
    WHEN _xp >= 4000 THEN 8
    WHEN _xp >= 2750 THEN 7
    WHEN _xp >= 1750 THEN 6
    WHEN _xp >= 1000 THEN 5
    WHEN _xp >= 500 THEN 4
    WHEN _xp >= 250 THEN 3
    WHEN _xp >= 100 THEN 2
    ELSE 1
  END;
END;
$$;

-- ============================================
-- 9. AWARD XP
-- ============================================
CREATE OR REPLACE FUNCTION public.award_xp(
  _user_id UUID,
  _workspace_id UUID,
  _event_type TEXT,
  _xp_amount INTEGER,
  _reference_id UUID DEFAULT NULL,
  _reference_type TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_total INTEGER;
  _old_level INTEGER;
  _new_level INTEGER;
BEGIN
  INSERT INTO public.user_progression (user_id, workspace_id, total_xp, current_level, last_activity_at)
  VALUES (_user_id, _workspace_id, _xp_amount, public.calculate_level_from_xp(_xp_amount), now())
  ON CONFLICT (user_id, workspace_id) DO UPDATE
    SET total_xp = user_progression.total_xp + _xp_amount,
        last_activity_at = now()
  RETURNING total_xp, current_level INTO _new_total, _old_level;

  _new_level := public.calculate_level_from_xp(_new_total);

  IF _new_level <> _old_level THEN
    UPDATE public.user_progression
      SET current_level = _new_level
      WHERE user_id = _user_id AND workspace_id = _workspace_id;

    INSERT INTO public.xp_events (user_id, workspace_id, event_type, xp_amount, metadata)
    VALUES (_user_id, _workspace_id, 'level_up', 0,
            jsonb_build_object('from_level', _old_level, 'to_level', _new_level));
  END IF;

  INSERT INTO public.xp_events (user_id, workspace_id, event_type, xp_amount, reference_id, reference_type, metadata)
  VALUES (_user_id, _workspace_id, _event_type, _xp_amount, _reference_id, _reference_type, _metadata);

  IF _event_type = 'module_completed' THEN
    UPDATE public.user_progression
      SET modules_completed = modules_completed + 1
      WHERE user_id = _user_id AND workspace_id = _workspace_id;
  ELSIF _event_type = 'quiz_passed' THEN
    UPDATE public.user_progression
      SET quizzes_passed = quizzes_passed + 1
      WHERE user_id = _user_id AND workspace_id = _workspace_id;
  END IF;

  RETURN jsonb_build_object(
    'total_xp', _new_total,
    'current_level', _new_level,
    'leveled_up', _new_level > _old_level,
    'previous_level', _old_level
  );
END;
$$;

-- ============================================
-- 10. SUBMIT QUIZ ATTEMPT
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _presentation_id UUID,
  _workspace_id UUID,
  _answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _module_slug TEXT;
  _min_score INTEGER;
  _xp_reward INTEGER;
  _total INTEGER := 0;
  _correct INTEGER := 0;
  _score INTEGER;
  _passed BOOLEAN;
  _attempt_id UUID;
  _xp_result JSONB := NULL;
  _q RECORD;
  _user_answer INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  SELECT module_slug, min_score_percent, xp_reward
    INTO _module_slug, _min_score, _xp_reward
  FROM public.module_presentations
  WHERE id = _presentation_id;

  IF _module_slug IS NULL THEN
    RAISE EXCEPTION 'Presentation not found';
  END IF;

  FOR _q IN
    SELECT id, correct_option_index
    FROM public.module_quizzes
    WHERE presentation_id = _presentation_id AND is_active = true
    ORDER BY order_index
  LOOP
    _total := _total + 1;
    _user_answer := COALESCE((_answers ->> (_total - 1)::text)::INTEGER, -1);
    IF _user_answer = _q.correct_option_index THEN
      _correct := _correct + 1;
    END IF;
  END LOOP;

  IF _total = 0 THEN
    _score := 100;
  ELSE
    _score := ROUND((_correct::numeric / _total::numeric) * 100);
  END IF;

  _passed := _score >= _min_score;

  INSERT INTO public.module_quiz_attempts (
    user_id, workspace_id, presentation_id, module_slug,
    score_percent, total_questions, correct_answers, passed, answers
  )
  VALUES (
    _user_id, _workspace_id, _presentation_id, _module_slug,
    _score, _total, _correct, _passed, _answers
  )
  RETURNING id INTO _attempt_id;

  IF _passed THEN
    _xp_result := public.award_xp(
      _user_id, _workspace_id, 'quiz_passed', _xp_reward,
      _attempt_id, 'quiz_attempt',
      jsonb_build_object('module_slug', _module_slug, 'score', _score)
    );
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id,
    'score_percent', _score,
    'total_questions', _total,
    'correct_answers', _correct,
    'passed', _passed,
    'min_score_required', _min_score,
    'xp_awarded', CASE WHEN _passed THEN _xp_reward ELSE 0 END,
    'progression', _xp_result
  );
END;
$$;

-- ============================================
-- 11. LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.workspace_progression_leaderboard
WITH (security_invoker = true) AS
SELECT
  up.workspace_id,
  up.user_id,
  p.full_name,
  p.avatar_url,
  up.total_xp,
  up.current_level,
  up.modules_completed,
  up.quizzes_passed,
  up.badges_earned,
  up.last_activity_at,
  ROW_NUMBER() OVER (PARTITION BY up.workspace_id ORDER BY up.total_xp DESC) AS rank
FROM public.user_progression up
LEFT JOIN public.profiles p ON p.id = up.user_id;

-- ============================================
-- 12. SEED BADGES
-- ============================================
INSERT INTO public.badge_definitions (code, name, description, icon, color, category, xp_reward, criteria)
VALUES
  ('first_module', 'Primeiros Passos', 'Completou o primeiro módulo', 'Footprints', '#10B981', 'milestone', 50, '{"modules_completed": 1}'::jsonb),
  ('crm_master', 'Mestre do CRM', 'Completou todos os módulos de CRM', 'Crown', '#F59E0B', 'mastery', 200, '{"modules": ["crm-contacts", "crm-opportunities", "crm-managers"]}'::jsonb),
  ('quiz_perfect', 'Pontuação Perfeita', 'Acertou 100% num quiz', 'Target', '#8B5CF6', 'achievement', 100, '{"quiz_score": 100}'::jsonb),
  ('5_modules', 'Explorador', 'Completou 5 módulos', 'Compass', '#3B82F6', 'milestone', 150, '{"modules_completed": 5}'::jsonb),
  ('10_modules', 'Veterano', 'Completou 10 módulos', 'Medal', '#EF4444', 'milestone', 300, '{"modules_completed": 10}'::jsonb),
  ('level_5', 'Nível 5', 'Atingiu o nível 5', 'Star', '#EC4899', 'level', 0, '{"level": 5}'::jsonb),
  ('level_10', 'Nível Máximo', 'Atingiu o nível 10', 'Trophy', '#FBBF24', 'level', 0, '{"level": 10}'::jsonb)
ON CONFLICT (code) DO NOTHING;