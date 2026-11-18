CREATE TABLE IF NOT EXISTS t_res (k text, v jsonb);
DO $t$
DECLARE mgr uuid := gen_random_uuid(); stranger uuid := gen_random_uuid(); exmember uuid := gen_random_uuid();
  w1 uuid; w2 uuid; c1 uuid; c2 uuid; k1 uuid; k2 uuid; ca uuid; cb uuid; cs uuid; pa uuid; po uuid; leg uuid;
  m1 uuid; m2 uuid; m3 uuid; mg jsonb; rows jsonb; r jsonb; pv jsonb; n int; e record; did uuid; ok boolean;
  b jsonb := jsonb_build_object('source_label','Ficheiro Teste','file_name','t.xlsx','file_hash',repeat('a',64),'sheet_name','Folha1');
BEGIN
  INSERT INTO workspaces(name,slug) VALUES ('w1','w1') RETURNING id INTO w1;
  INSERT INTO workspaces(name,slug) VALUES ('w2','w2') RETURNING id INTO w2;
  INSERT INTO workspace_members(workspace_id,user_id,role) VALUES (w1,mgr,'member');
  INSERT INTO sj_permissions(workspace_id,user_id,role) VALUES (w1,mgr,'gestao'), (w1,exmember,'gestao'); -- exmember sem membership
  PERFORM set_config('test.uid', mgr::text, false);
  INSERT INTO sj_courses(workspace_id,name) VALUES (w1,'Básica') RETURNING id INTO c1;
  INSERT INTO sj_courses(workspace_id,name) VALUES (w1,'Avançada') RETURNING id INTO c2;
  INSERT INTO sj_cohorts(workspace_id,course_id,name) VALUES (w1,c1,'PORTO24/1') RETURNING id INTO k1;
  INSERT INTO sj_cohorts(workspace_id,course_id,name) VALUES (w1,c2,'LISBOA23/2') RETURNING id INTO k2;
  PERFORM sj_import_set_label_map(w1,'FBTC PORTO24/1',c1,k1);
  PERFORM sj_import_set_label_map(w1,'FATC LISBOA23/2',c2,k2);
  INSERT INTO contacts(workspace_id,created_by,name,email,phone,tax_id,source) VALUES (w1,mgr,'Ana Maria Silva','ana@t.pt','912000001','123456789','origem-antiga') RETURNING id INTO ca;
  INSERT INTO contacts(workspace_id,created_by,name,phone) VALUES (w1,mgr,'Rui Costa','+44 7912 000002') RETURNING id INTO cb;
  INSERT INTO contacts(workspace_id,created_by,name,email,tax_id) VALUES (w1,mgr,'Pedro Alves','shared@t.pt','111111111') RETURNING id INTO cs;
  INSERT INTO contacts(workspace_id,created_by,name,email) VALUES (w2,mgr,'Novo Aluno','novo@t.pt');
  INSERT INTO sj_profiles(workspace_id,contact_id,full_name,email) VALUES (w1,ca,'Ana Maria Silva','ana@t.pt') RETURNING id INTO pa;
  INSERT INTO sj_profiles(workspace_id,full_name,email) VALUES (w1,'Joana Reis','joana@t.pt') RETURNING id INTO po;
  INSERT INTO sj_enrollments(workspace_id,profile_id,course_id,cohort_id,status,admin_status,pedagogic_status,financial_status,agreed_amount,payment_status,completed_at)
    VALUES (w1,pa,c1,NULL,'enrolled','confirmed','in_training','paid',300,'paid','2024-03-01') RETURNING id INTO leg;
  INSERT INTO sj_certificates(enrollment_id) VALUES (leg);

  rows := jsonb_build_array(
    jsonb_build_object('source_row','2','full_name','Ana Maria Silva','email','ANA@t.pt','phone','+351912000001','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','3','full_name','Rui Costa','phone','00447912000002','pedagogic_status','completed','labels',jsonb_build_array('fbtc  porto24/1')),
    jsonb_build_object('source_row','4','full_name','Rita Lopes','phone','7912000002','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','5','full_name','Joana Reis','email','joana@t.pt','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','6','full_name','Pedro Alves','email','shared@t.pt','nif','123456789','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','7','full_name','Carlos Mendes','nif','123456789','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','8','full_name','Novo Aluno','email','novo@t.pt','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','9','full_name','Marta Dias','email','912000001','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1')),
    jsonb_build_object('source_row','10','full_name','Sem Rotulo','email','semr@t.pt','pedagogic_status','completed'),
    jsonb_build_object('source_row','11','full_name','Rotulo Misto','email','misto@t.pt','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1','Desconhecido')),
    jsonb_build_object('source_row','12','full_name','Outra Edicao','email','outra@t.pt','pedagogic_status','completed','labels',jsonb_build_array('FBTC PORTO24/1','FATC LISBOA23/2')),
    jsonb_build_object('source_row','13','full_name','Pedro Alves','email','shared@t.pt','nif','123456789','labels',jsonb_build_array('FBTC PORTO24/1'),
       'decision',jsonb_build_object('contact','new','profile','new')));

  pv := sj_import_preview(w1,k1,b,rows);
  INSERT INTO t_res VALUES ('preview', (SELECT jsonb_object_agg(x->>'source_row', concat_ws('|', x->>'status', x->'resolution'->>'pending', x->>'label_status')) FROM jsonb_array_elements(pv) x));

  r := sj_import_historical_rows(w1,k1,b,rows);
  INSERT INTO t_res VALUES ('run1', r - 'job_id');
  SELECT * INTO e FROM sj_enrollments WHERE workspace_id=w1 AND cohort_id=k1 AND source='import' ORDER BY created_at LIMIT 1;
  INSERT INTO t_res VALUES ('finance_unknown', jsonb_build_object('unknown', e.financial_unknown, 'pay', e.payment_status, 'fin', e.financial_status, 'agreed', e.agreed_amount, 'completed_at', e.completed_at));
  INSERT INTO t_res VALUES ('kept', jsonb_build_object('contact_source', (SELECT source FROM contacts WHERE id=ca), 'legacy_null', (SELECT cohort_id IS NULL FROM sj_enrollments WHERE id=leg),
     'w2_contacts', (SELECT count(*) FROM contacts WHERE workspace_id=w2)));

  -- A) manipulação: decisão para linha com conflito duro é recusada
  BEGIN PERFORM sj_import_record_decision(w1,b,rows->4,jsonb_build_object('contact',cs,'profile','new'),'tentativa manual');
    INSERT INTO t_res VALUES ('hard_conflict_decision_refused','false');
  EXCEPTION WHEN OTHERS THEN INSERT INTO t_res VALUES ('hard_conflict_decision_refused', to_jsonb(SQLERRM)); END;
  -- decisões legítimas: Ana -> inscrição antiga; Joana -> contacto novo + perfil órfão
  PERFORM sj_import_record_decision(w1,b,rows->0,jsonb_build_object('contact',ca,'profile',pa,'cohort_id',k1,'legacy',leg),'Mesma pessoa, inscrição antiga do Excel');
  PERFORM sj_import_record_decision(w1,b,rows->3,jsonb_build_object('contact','new','profile',po),'Perfil órfão confirmado pela secretaria');
  r := sj_import_historical_rows(w1,k1,b,rows);
  INSERT INTO t_res VALUES ('run2', r - 'job_id');
  INSERT INTO t_res VALUES ('legacy_after', (SELECT jsonb_build_object('cohort_ok', cohort_id=k1, 'ped', pedagogic_status, 'fin', financial_status, 'agreed', agreed_amount,
     'completed_at_kept', completed_at = '2024-03-01'::timestamptz, 'cert', (SELECT count(*) FROM sj_certificates WHERE enrollment_id=leg)) FROM sj_enrollments WHERE id=leg));
  INSERT INTO t_res VALUES ('orphan_linked', (SELECT to_jsonb(contact_id IS NOT NULL) FROM sj_profiles WHERE id=po));

  SELECT count(*) INTO n FROM sj_import_provenance WHERE workspace_id=w1;
  r := sj_import_historical_rows(w1,k1,b,rows);
  INSERT INTO t_res VALUES ('run3_same_batch', (r - 'job_id') || jsonb_build_object('prov_before',n,'prov_after',(SELECT count(*) FROM sj_import_provenance WHERE workspace_id=w1)));

  -- decisão obsoleta: dados da linha mudam -> pendente
  r := sj_import_historical_rows(w1,k1,b,jsonb_build_array(jsonb_set(rows->3,'{email}','"joana.reis@t.pt"')));
  INSERT INTO t_res VALUES ('changed_row', r->'pending');

  -- E) consolidação e reimportação: perfil do Rui fundido noutro perfil
  INSERT INTO sj_profiles(workspace_id,full_name) VALUES (w1,'Rui Costa') RETURNING id INTO m2;
  SELECT id INTO m1 FROM sj_profiles WHERE contact_id=cb;
  mg := sj_profile_merge(w1,m1,m2,'Duplicado confirmado');
  INSERT INTO t_res VALUES ('merge', jsonb_build_object('status',mg->>'status','m1_archived',(SELECT merged_into_profile_id=m2 FROM sj_profiles WHERE id=m1),
     'm2_contact',(SELECT contact_id=cb FROM sj_profiles WHERE id=m2)));
  r := sj_import_historical_rows(w1,k1,b,rows);
  INSERT INTO t_res VALUES ('run4_after_merge', (r - 'job_id') - 'pending');

  -- F) colisão registada como bloqueada, sem mover nada
  INSERT INTO sj_profiles(workspace_id,full_name) VALUES (w1,'Rui Costa') RETURNING id INTO m3;
  INSERT INTO sj_enrollments(workspace_id,profile_id,course_id,cohort_id,financial_status,agreed_amount) VALUES (w1,m3,c1,k1,'unpaid',100);
  mg := sj_profile_merge(w1,m3,m2,'Teste colisão');
  INSERT INTO t_res VALUES ('coincident', jsonb_build_object('status',mg->>'status','blockers',mg->'blockers','m3_enr',(SELECT count(*) FROM sj_enrollments WHERE profile_id=m3),
     'm3_active',(SELECT archived_at IS NULL FROM sj_profiles WHERE id=m3)));
  -- dependente de outro workspace bloqueia
  INSERT INTO sj_profiles(workspace_id,full_name) VALUES (w1,'X Y') RETURNING id INTO m3;
  INSERT INTO sj_tasks(workspace_id,profile_id) VALUES (w2,m3);
  INSERT INTO t_res VALUES ('cross_ws', sj_profile_merge_preview(w1,m3,m2)->'blockers');
  -- reversão
  SELECT id INTO did FROM sj_profile_merges WHERE status='completed' LIMIT 1;
  PERFORM sj_profile_merge_revert(w1,did);
  INSERT INTO t_res VALUES ('revert', jsonb_build_object('m1_active',(SELECT archived_at IS NULL FROM sj_profiles WHERE id=m1),'m1_contact',(SELECT contact_id=cb FROM sj_profiles WHERE id=m1),
     'm1_enr',(SELECT count(*) FROM sj_enrollments WHERE profile_id=m1)));

  -- B) permissões
  PERFORM set_config('test.uid', exmember::text, false);
  INSERT INTO t_res VALUES ('old_helper_accepts_exmember', to_jsonb(sj_has_any_role(w1, ARRAY['gestao'])));
  BEGIN PERFORM sj_import_preview(w1,k1,b,rows); INSERT INTO t_res VALUES ('exmember_blocked','false');
  EXCEPTION WHEN OTHERS THEN INSERT INTO t_res VALUES ('exmember_blocked','true'); END;
  PERFORM set_config('test.uid', stranger::text, false);
  BEGIN PERFORM sj_profile_merge(w1,m1,m2,'sem permissao'); INSERT INTO t_res VALUES ('stranger_merge_blocked','false');
  EXCEPTION WHEN OTHERS THEN INSERT INTO t_res VALUES ('stranger_merge_blocked','true'); END;
  BEGIN PERFORM sj_import_historical_rows(w2,k1,b,rows); INSERT INTO t_res VALUES ('cross_ws_cohort_blocked','false');
  EXCEPTION WHEN OTHERS THEN INSERT INTO t_res VALUES ('cross_ws_cohort_blocked','true'); END;
  PERFORM set_config('test.uid', '', false);
  BEGIN PERFORM sj_import_preview(w1,k1,b,rows); INSERT INTO t_res VALUES ('anon_blocked','false');
  EXCEPTION WHEN OTHERS THEN INSERT INTO t_res VALUES ('anon_blocked','true'); END;
END $t$;
SELECT k, v FROM t_res;
