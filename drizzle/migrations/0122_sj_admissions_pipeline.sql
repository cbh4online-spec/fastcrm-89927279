ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS sj_course_id uuid REFERENCES public.sj_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sj_cohort_id uuid REFERENCES public.sj_cohorts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sj_enrollment_id uuid REFERENCES public.sj_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_opportunities_sj_course ON public.opportunities(workspace_id, sj_course_id) WHERE sj_course_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sj_ensure_admissions_pipeline(_workspace_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _names text[] := ARRAY['Novo interessado','A contactar','Contactado','Interesse qualificado','Proposta ou informação enviada','Inscrição pendente','Inscrição confirmada','Convertido','Sem resposta','Perdido ou sem interesse','Acompanhamento futuro'];
  _codes text[] := ARRAY['new','to_contact','contacted','qualified','proposal_sent','enrollment_pending','enrollment_confirmed','converted','no_answer','lost','future_followup'];
  _prob int[] := ARRAY[5,10,20,40,55,70,90,100,5,0,10];
  _colors text[] := ARRAY['#64748b','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#f59e0b','#10b981','#16a34a','#94a3b8','#ef4444','#14b8a6'];
  i int;
BEGIN
  IF NOT (_workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO _pid FROM public.pipelines WHERE workspace_id = _workspace_id AND code = 'sj_admissions' LIMIT 1;
  IF _pid IS NOT NULL THEN RETURN _pid; END IF;
  INSERT INTO public.pipelines(workspace_id, name, type, description, is_default, code)
  VALUES (_workspace_id, 'Admissões — Jornada do Aluno', 'student_journey', 'Pipeline comercial de admissões e matrículas', false, 'sj_admissions')
  RETURNING id INTO _pid;
  FOR i IN 1..11 LOOP
    INSERT INTO public.pipeline_stages(workspace_id, pipeline_id, name, position, color, probability, config)
    VALUES (_workspace_id, _pid, _names[i], i-1, _colors[i], _prob[i], jsonb_build_object('stage_code', _codes[i]));
  END LOOP;
  RETURN _pid;
END $$;
REVOKE ALL ON FUNCTION public.sj_ensure_admissions_pipeline(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sj_ensure_admissions_pipeline(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.sj_convert_opportunity_to_enrollment(_opportunity_id uuid, _cohort_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; _profile uuid; _course uuid; _enr uuid; _cohort_course uuid;
BEGIN
  SELECT * INTO o FROM public.opportunities WHERE id = _opportunity_id;
  IF o.id IS NULL OR NOT (o.workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF o.sj_enrollment_id IS NOT NULL THEN RETURN o.sj_enrollment_id; END IF;
  IF o.contact_id IS NULL THEN RAISE EXCEPTION 'Oportunidade sem contacto associado'; END IF;
  _course := o.sj_course_id;
  IF _cohort_id IS NOT NULL THEN
    SELECT course_id INTO _cohort_course FROM public.sj_cohorts WHERE id = _cohort_id AND workspace_id = o.workspace_id;
    IF _cohort_course IS NULL THEN RAISE EXCEPTION 'Turma inválida'; END IF;
    _course := coalesce(_course, _cohort_course);
    IF _course <> _cohort_course THEN RAISE EXCEPTION 'A turma não pertence ao curso pretendido'; END IF;
  END IF;
  IF _course IS NULL THEN RAISE EXCEPTION 'Indique o curso pretendido'; END IF;
  SELECT id INTO _profile FROM public.sj_profiles WHERE workspace_id = o.workspace_id AND contact_id = o.contact_id ORDER BY created_at LIMIT 1;
  IF _profile IS NULL THEN
    INSERT INTO public.sj_profiles(workspace_id, contact_id, full_name, email, phone)
    SELECT o.workspace_id, c.id, c.name, c.email, c.phone FROM public.contacts c WHERE c.id = o.contact_id
    RETURNING id INTO _profile;
  END IF;
  SELECT id INTO _enr FROM public.sj_enrollments
   WHERE workspace_id = o.workspace_id AND profile_id = _profile AND course_id = _course
     AND cohort_id IS NOT DISTINCT FROM _cohort_id AND coalesce(admin_status,'') <> 'cancelled' LIMIT 1;
  IF _enr IS NULL THEN
    INSERT INTO public.sj_enrollments(workspace_id, profile_id, course_id, cohort_id, status, source, admin_status, pedagogic_status, financial_status, agreed_amount, responsible_user_id, notes)
    VALUES (o.workspace_id, _profile, _course, _cohort_id, 'enrolled', 'manual', 'confirmed', 'not_started', 'unpaid', nullif(o.value,0), o.owner_id, 'Criada a partir da oportunidade de admissão')
    RETURNING id INTO _enr;
  END IF;
  UPDATE public.opportunities SET sj_enrollment_id = _enr, sj_cohort_id = coalesce(_cohort_id, sj_cohort_id), updated_at = now() WHERE id = o.id;
  RETURN _enr;
END $$;
REVOKE ALL ON FUNCTION public.sj_convert_opportunity_to_enrollment(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sj_convert_opportunity_to_enrollment(uuid, uuid) TO authenticated;