-- Simulação auto-anulada (RAISE EXCEPTION no fim): renumeração legada só move filas abertas.
-- Resultado obtido (0067): sent_case=sent|step2_sent_idx=2|step1_row_idx=1:sent ; cancel_case=sent|step2_cancel_idx=2:cancelled ; open_case=sent|open_moved=3
DO $sim$
DECLARE r text := ''; ws uuid; uid uuid;
BEGIN
SELECT wm.workspace_id, wm.user_id INTO ws, uid FROM workspace_members wm WHERE wm.workspace_id='1d208cbe-3285-45d0-8d9e-7d2bd6e9b2d6' LIMIT 1;
INSERT INTO professional_prospecting_profiles (id, workspace_id, profile_name, profile_url, platform, status) VALUES
 ('00000000-0000-4000-8000-0000000000d1', ws, 'SimRn Sent Qx7', 'https://www.instagram.com/simqx7sent', 'instagram', 'pending'),
 ('00000000-0000-4000-8000-0000000000d2', ws, 'SimRn Canc Qx7', 'https://www.instagram.com/simqx7canc', 'instagram', 'pending'),
 ('00000000-0000-4000-8000-0000000000d3', ws, 'SimRn Open Qx7', 'https://www.instagram.com/simqx7open', 'instagram', 'pending');
INSERT INTO prospecting_outreach_queue (id, workspace_id, profile_id, step_index, status, scheduled_for, sent_at, sent_message) VALUES
 ('00000000-0000-4000-8000-0000000000e1', ws, '00000000-0000-4000-8000-0000000000d1', 1, 'ready', now(), NULL, NULL),
 ('00000000-0000-4000-8000-0000000000e2', ws, '00000000-0000-4000-8000-0000000000d1', 2, 'sent', now(), now(), 'x'),
 ('00000000-0000-4000-8000-0000000000e3', ws, '00000000-0000-4000-8000-0000000000d2', 1, 'ready', now(), NULL, NULL),
 ('00000000-0000-4000-8000-0000000000e4', ws, '00000000-0000-4000-8000-0000000000d2', 2, 'cancelled', now(), NULL, NULL),
 ('00000000-0000-4000-8000-0000000000e5', ws, '00000000-0000-4000-8000-0000000000d3', 1, 'ready', now(), NULL, NULL),
 ('00000000-0000-4000-8000-0000000000e6', ws, '00000000-0000-4000-8000-0000000000d3', 2, 'scheduled', now(), NULL, NULL);
PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
r := r || 'sent_case=' || (prospecting_confirm_outreach(ws,'00000000-0000-4000-8000-0000000000d1',1,'msg',NULL,NULL,true,NULL,NULL,NULL,false,'[]'::jsonb,true)->>'status');
r := r || '|step2_sent_idx=' || (SELECT step_index FROM prospecting_outreach_queue WHERE id='00000000-0000-4000-8000-0000000000e2');
r := r || '|step1_row_idx=' || (SELECT step_index||':'||status FROM prospecting_outreach_queue WHERE id='00000000-0000-4000-8000-0000000000e1');
r := r || ' ; cancel_case=' || (prospecting_confirm_outreach(ws,'00000000-0000-4000-8000-0000000000d2',1,'msg',NULL,NULL,true,NULL,NULL,NULL,false,'[]'::jsonb,true)->>'status');
r := r || '|step2_cancel_idx=' || (SELECT step_index||':'||status FROM prospecting_outreach_queue WHERE id='00000000-0000-4000-8000-0000000000e4');
r := r || ' ; open_case=' || (prospecting_confirm_outreach(ws,'00000000-0000-4000-8000-0000000000d3',1,'msg',NULL,NULL,true,NULL,NULL,NULL,false,'[]'::jsonb,true)->>'status');
r := r || '|open_moved=' || (SELECT step_index FROM prospecting_outreach_queue WHERE id='00000000-0000-4000-8000-0000000000e6');
RAISE EXCEPTION 'SIM_RESULT %', r;
END
$sim$;
