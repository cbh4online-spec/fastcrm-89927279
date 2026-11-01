ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.implementation_projects(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.implementation_project_tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_task ON public.support_tickets(task_id);

ALTER TABLE public.implementation_time_entries
  ADD COLUMN IF NOT EXISTS client_approval_status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS client_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS client_note text;
ALTER TABLE public.support_ticket_time_entries
  ADD COLUMN IF NOT EXISTS client_approval_status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS client_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS client_note text;
ALTER TABLE public.implementation_time_entries ADD CONSTRAINT ite_client_approval_chk CHECK (client_approval_status IN ('submitted','pending_client','approved','disputed'));
ALTER TABLE public.support_ticket_time_entries ADD CONSTRAINT stte_client_approval_chk CHECK (client_approval_status IN ('submitted','pending_client','approved','disputed'));

-- Ticket task must belong to same workspace
CREATE OR REPLACE FUNCTION public.support_ticket_task_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    SELECT t.project_id INTO NEW.project_id FROM implementation_project_tasks t
     WHERE t.id = NEW.task_id AND t.workspace_id = NEW.workspace_id;
    IF NEW.project_id IS NULL THEN RAISE EXCEPTION 'Tarefa de outro workspace'; END IF;
  END IF;
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM implementation_projects p WHERE p.id = NEW.project_id AND p.workspace_id = NEW.workspace_id) THEN
    RAISE EXCEPTION 'Projeto de outro workspace';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_support_ticket_task_guard ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_task_guard BEFORE INSERT OR UPDATE OF task_id, project_id ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_ticket_task_guard();

-- Client portal helper: active client user for current auth user
CREATE OR REPLACE FUNCTION public.portal_client_user(_workspace uuid)
RETURNS TABLE(client_user_id uuid, company_id uuid, can_approve boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cu.id, cu.company_id,
    EXISTS (SELECT 1 FROM client_user_roles r WHERE r.client_user_id = cu.id AND r.role::text IN ('client_admin','client_financial'))
  FROM client_users cu
  WHERE cu.auth_user_id = auth.uid() AND cu.workspace_id = _workspace
    AND cu.company_id IS NOT NULL AND cu.status::text = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.portal_list_work(_workspace uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM portal_client_user(_workspace);
  IF c.company_id IS NULL THEN RAISE EXCEPTION 'Sem acesso' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'can_approve', c.can_approve,
    'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'status', p.status, 'progress', p.progress_percentage,
        'tasks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'status', t.status,
            'due_at', t.due_at, 'estimated_hours', t.estimated_hours,
            'used_minutes', (SELECT COALESCE(sum(e.duration_minutes),0) FROM implementation_time_entries e WHERE e.task_id = t.id))
          ORDER BY t.sort_order) FROM implementation_project_tasks t WHERE t.project_id = p.id AND t.visible_to_customer), '[]'::jsonb)
      ) ORDER BY p.created_at DESC) FROM implementation_projects p
      WHERE p.workspace_id = _workspace AND p.company_id = c.company_id AND p.status <> 'cancelled'), '[]'::jsonb),
    'tickets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status,
        'priority', s.priority, 'created_at', s.created_at, 'project_id', s.project_id, 'task_id', s.task_id) ORDER BY s.created_at DESC)
      FROM support_tickets s WHERE s.workspace_id = _workspace AND s.company_id = c.company_id), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.portal_list_hours(_workspace uuid, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM portal_client_user(_workspace);
  IF c.company_id IS NULL THEN RAISE EXCEPTION 'Sem acesso' USING ERRCODE = '42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(x ORDER BY x->>'date' DESC) FROM (
    SELECT jsonb_build_object('kind','project','id',e.id,'date',e.entry_date,'minutes',e.duration_minutes,
      'description',e.description,'label',p.title,'task',t.title,'status',e.client_approval_status,'note',e.client_note,'retainer',r.name) x
    FROM implementation_time_entries e JOIN service_retainers r ON r.id = e.retainer_id
    JOIN implementation_projects p ON p.id = e.project_id
    LEFT JOIN implementation_project_tasks t ON t.id = e.task_id
    WHERE r.workspace_id = _workspace AND r.company_id = c.company_id AND e.entry_date BETWEEN _from AND _to AND e.client_approval_status <> 'submitted'
    UNION ALL
    SELECT jsonb_build_object('kind','ticket','id',e.id,'date',(e.created_at AT TIME ZONE 'Europe/Lisbon')::date,'minutes',e.duration_minutes,
      'description',e.description,'label',s.title,'task',null,'status',e.client_approval_status,'note',e.client_note,'retainer',r.name)
    FROM support_ticket_time_entries e JOIN service_retainers r ON r.id = e.retainer_id
    JOIN support_tickets s ON s.id = e.ticket_id
    WHERE r.workspace_id = _workspace AND r.company_id = c.company_id
      AND (e.created_at AT TIME ZONE 'Europe/Lisbon')::date BETWEEN _from AND _to AND e.client_approval_status <> 'submitted'
  ) q), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.portal_review_hours(_workspace uuid, _items jsonb, _decision text, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; n1 int; n2 int;
BEGIN
  IF _decision NOT IN ('approved','disputed') THEN RAISE EXCEPTION 'Decisão inválida'; END IF;
  IF _decision = 'disputed' AND COALESCE(length(trim(_note)),0) = 0 THEN RAISE EXCEPTION 'Indique o motivo'; END IF;
  IF length(COALESCE(_note,'')) > 1000 THEN RAISE EXCEPTION 'Nota demasiado longa'; END IF;
  SELECT * INTO c FROM portal_client_user(_workspace);
  IF c.company_id IS NULL OR NOT c.can_approve THEN RAISE EXCEPTION 'Sem permissão para aprovar' USING ERRCODE = '42501'; END IF;
  UPDATE implementation_time_entries e SET client_approval_status = _decision, client_reviewed_at = now(), client_reviewed_by = c.client_user_id, client_note = _note
   FROM service_retainers r
   WHERE r.id = e.retainer_id AND r.workspace_id = _workspace AND r.company_id = c.company_id
     AND e.client_approval_status IN ('pending_client','disputed')
     AND e.id IN (SELECT (i->>'id')::uuid FROM jsonb_array_elements(_items) i WHERE i->>'kind' = 'project');
  GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE support_ticket_time_entries e SET client_approval_status = _decision, client_reviewed_at = now(), client_reviewed_by = c.client_user_id, client_note = _note
   FROM service_retainers r
   WHERE r.id = e.retainer_id AND r.workspace_id = _workspace AND r.company_id = c.company_id
     AND e.client_approval_status IN ('pending_client','disputed')
     AND e.id IN (SELECT (i->>'id')::uuid FROM jsonb_array_elements(_items) i WHERE i->>'kind' = 'ticket');
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END $$;

REVOKE ALL ON FUNCTION public.portal_client_user(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.portal_list_work(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.portal_list_hours(uuid, date, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.portal_review_hours(uuid, jsonb, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.portal_client_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_hours(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_review_hours(uuid, jsonb, text, text) TO authenticated;