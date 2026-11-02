CREATE OR REPLACE FUNCTION public.portal_retainer_summary(_workspace uuid, _month date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE c record; month_start date; month_end date;
BEGIN
 SELECT * INTO c FROM public.portal_client_user(_workspace);
 IF c.company_id IS NULL THEN RAISE EXCEPTION 'Sem acesso' USING ERRCODE = '42501'; END IF;
 IF _month IS NULL THEN RAISE EXCEPTION 'Mês obrigatório' USING ERRCODE = '22023'; END IF;
 month_start := date_trunc('month', _month)::date;
 month_end := (month_start + interval '1 month')::date;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'id', r.id, 'name', r.name, 'included_hours', r.included_hours,
  'entries', COALESCE((SELECT jsonb_agg(x) FROM (
   SELECT jsonb_build_object('source','project','minutes',e.duration_minutes,'billable',e.billable) x
   FROM public.implementation_time_entries e JOIN public.implementation_projects p ON p.id=e.project_id
   WHERE e.retainer_id=r.id AND e.workspace_id=_workspace AND p.workspace_id=_workspace AND p.company_id=c.company_id AND e.entry_date>=month_start AND e.entry_date<month_end
   UNION ALL
   SELECT jsonb_build_object('source','ticket','minutes',e.duration_minutes,'billable',true)
   FROM public.support_ticket_time_entries e JOIN public.support_tickets s ON s.id=e.ticket_id
   WHERE e.retainer_id=r.id AND e.workspace_id=_workspace AND s.workspace_id=_workspace AND s.company_id=c.company_id
    AND (COALESCE(e.started_at,e.created_at) AT TIME ZONE 'Europe/Lisbon')::date>=month_start
    AND (COALESCE(e.started_at,e.created_at) AT TIME ZONE 'Europe/Lisbon')::date<month_end
  ) q),'[]'::jsonb)
 ) ORDER BY r.name) FROM public.service_retainers r
 WHERE r.workspace_id=_workspace AND r.company_id=c.company_id AND r.status='active'
 AND r.start_date<month_end AND (r.end_date IS NULL OR r.end_date>=month_start)), '[]'::jsonb);
END $function$;
REVOKE ALL ON FUNCTION public.portal_retainer_summary(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_retainer_summary(uuid,date) TO authenticated;
COMMENT ON FUNCTION public.portal_retainer_summary(uuid,date) IS 'Client-company scoped monthly allowance and minimal time totals. No internal descriptions or commercial rates exposed.';