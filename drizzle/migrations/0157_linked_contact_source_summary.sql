CREATE OR REPLACE FUNCTION public.get_linked_contact_source_summary(_contact_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE src uuid; src_ws uuid; buyer uuid; lbl text; res jsonb;
BEGIN
  SELECT rl.source_id, l.supplier_workspace_id, l.buyer_workspace_id, l.origin_label
    INTO src, src_ws, buyer, lbl
  FROM public.workspace_record_links rl JOIN public.workspace_supply_links l ON l.id = rl.link_id
  WHERE rl.entity_type = 'contact' AND rl.target_id = _contact_id AND l.active AND l.sync_crm LIMIT 1;
  IF src IS NULL THEN RETURN NULL; END IF;
  IF NOT (buyer IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'origin', lbl,
    'contact', (SELECT jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone,'tax_id',c.tax_id,'address',c.address,'city',c.city,'postal_code',c.postal_code,'country',c.country,'job_title',c.job_title,'birth_date',c.birth_date,'client_since',c.client_since,'company',COALESCE(co.name,c.company)) FROM public.contacts c LEFT JOIN public.companies co ON co.id=c.company_id WHERE c.id=src),
    'invoices', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'issue_date' DESC) FROM (SELECT jsonb_build_object('number',i.invoice_number,'issue_date',i.issue_date,'status',i.status,'total',i.total,'amount_paid',i.amount_paid) x FROM public.invoices i WHERE i.workspace_id=src_ws AND i.contact_id=src AND COALESCE(i.status,'') NOT IN ('draft') ORDER BY i.issue_date DESC LIMIT 100) s),'[]'::jsonb),
    'enrollments', COALESCE((SELECT jsonb_agg(jsonb_build_object('course',cr.name,'cohort',ch.name,'start_date',COALESCE(ch.start_date,e.started_at::date),'completed_at',e.completed_at,'status',COALESCE(e.pedagogic_status,e.status),'financial_status',e.financial_status) ORDER BY COALESCE(ch.start_date,e.started_at::date) DESC NULLS LAST)
       FROM public.sj_profiles p JOIN public.sj_enrollments e ON e.profile_id=p.id
       LEFT JOIN public.sj_courses cr ON cr.id=e.course_id LEFT JOIN public.sj_cohorts ch ON ch.id=e.cohort_id
       WHERE p.workspace_id=src_ws AND p.contact_id=src AND p.archived_at IS NULL),'[]'::jsonb)
  ) INTO res;
  RETURN res;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_linked_contact_source_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_linked_contact_source_summary(uuid) TO authenticated;