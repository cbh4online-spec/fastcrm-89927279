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
    'tickets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.subject, 'number', s.ticket_number, 'status', s.status,
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
    SELECT jsonb_build_object('kind','ticket','id',e.id,'date',(COALESCE(e.started_at,e.created_at) AT TIME ZONE 'Europe/Lisbon')::date,'minutes',e.duration_minutes,
      'description',e.description,'label',s.subject,'task',null,'status',e.client_approval_status,'note',e.client_note,'retainer',r.name)
    FROM support_ticket_time_entries e JOIN service_retainers r ON r.id = e.retainer_id
    JOIN support_tickets s ON s.id = e.ticket_id
    WHERE r.workspace_id = _workspace AND r.company_id = c.company_id
      AND (COALESCE(e.started_at,e.created_at) AT TIME ZONE 'Europe/Lisbon')::date BETWEEN _from AND _to AND e.client_approval_status <> 'submitted'
  ) q), '[]'::jsonb);
END $$;