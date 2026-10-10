-- Simulação auto-anulada (termina sempre com RAISE EXCEPTION): follow-up convertido legítimo, lead bloqueado, oportunidade, stopped+ready duplicado.
-- Esperado: legit_followup=sent, step1_converted=exists, blocked_lead=blocked, opp_lead=opportunity, stopped_*=stopped.
DO $sim$
DECLARE r text := '';
BEGIN
PERFORM set_config('request.jwt.claims', json_build_object('sub', wm.user_id, 'role','authenticated')::text, true),
       set_config('sim.ws', wm.workspace_id::text, true), set_config('sim.uid', wm.user_id::text, true)
  FROM workspace_members wm WHERE wm.workspace_id='1d208cbe-3285-45d0-8d9e-7d2bd6e9b2d6' LIMIT 1;
INSERT INTO leads (id, workspace_id, name, status, is_blocked) VALUES
 ('00000000-0000-4000-8000-0000000000a1', current_setting('sim.ws')::uuid, 'SimLead Ok Zq9', 'new', false),
 ('00000000-0000-4000-8000-0000000000a2', current_setting('sim.ws')::uuid, 'SimLead Blk Zq9', 'new', true),
 ('00000000-0000-4000-8000-0000000000a3', current_setting('sim.ws')::uuid, 'SimLead Opp Zq9', 'new', false);
INSERT INTO professional_prospecting_profiles (id, workspace_id, profile_name, profile_url, platform, status, converted_lead_id) VALUES
 ('00000000-0000-4000-8000-0000000000b1', current_setting('sim.ws')::uuid, 'SimProf Ok Zq9', 'https://www.instagram.com/simzq9ok', 'instagram', 'converted', '00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000000b2', current_setting('sim.ws')::uuid, 'SimProf Blk Zq9', 'https://www.instagram.com/simzq9blk', 'instagram', 'converted', '00000000-0000-4000-8000-0000000000a2'),
 ('00000000-0000-4000-8000-0000000000b3', current_setting('sim.ws')::uuid, 'SimProf Opp Zq9', 'https://www.instagram.com/simzq9opp', 'instagram', 'converted', '00000000-0000-4000-8000-0000000000a3'),
 ('00000000-0000-4000-8000-0000000000b4', current_setting('sim.ws')::uuid, 'SimProf Stop Zq9', 'https://www.instagram.com/simzq9stop', 'instagram', 'pending', NULL);
INSERT INTO opportunities (workspace_id, lead_id, status, title, stage_id, owner_id) SELECT current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000a3', 'open', 'SimOpp', ps.id, current_setting('sim.uid')::uuid FROM pipeline_stages ps WHERE ps.workspace_id=current_setting('sim.ws')::uuid LIMIT 1;
INSERT INTO prospecting_outreach_queue (id, workspace_id, profile_id, step_index, status, scheduled_for, sent_at, sent_message)
SELECT gen_random_uuid(), current_setting('sim.ws')::uuid, p, 1, 'sent', now(), now(), 'x'
  FROM unnest(ARRAY['00000000-0000-4000-8000-0000000000b1','00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000b3']::uuid[]) p;
INSERT INTO prospecting_outreach_queue (id, workspace_id, profile_id, step_index, status, scheduled_for) VALUES
 ('00000000-0000-4000-8000-0000000000c1', current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000b1', 2, 'ready', now()),
 ('00000000-0000-4000-8000-0000000000c2', current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000b2', 2, 'ready', now()),
 ('00000000-0000-4000-8000-0000000000c3', current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000b3', 2, 'ready', now()),
 ('00000000-0000-4000-8000-0000000000c4', current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000b4', 1, 'cancelled', now()),
 ('00000000-0000-4000-8000-0000000000c5', current_setting('sim.ws')::uuid, '00000000-0000-4000-8000-0000000000b4', 1, 'ready', now());
r := r || ' | legit_followup=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b1',2,'msg',NULL,'00000000-0000-4000-8000-0000000000c1'))::text,'null');
r := r || ' | step1_converted=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b1',1,'msg')->>'status')::text,'null');
r := r || ' | blocked_lead=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b2',2,'msg',NULL,'00000000-0000-4000-8000-0000000000c2')->>'status')::text,'null');
r := r || ' | opp_lead=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b3',2,'msg',NULL,'00000000-0000-4000-8000-0000000000c3')->>'status')::text,'null');
r := r || ' | stopped_with_queue=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b4',1,'msg',NULL,'00000000-0000-4000-8000-0000000000c5')->>'status')::text,'null');
r := r || ' | stopped_no_queue=' || coalesce((prospecting_confirm_outreach(current_setting('sim.ws')::uuid,'00000000-0000-4000-8000-0000000000b4',1,'msg')->>'status')::text,'null');
r := r || ' | untouched=' || (SELECT string_agg(status, ',') FROM prospecting_outreach_queue WHERE id IN ('00000000-0000-4000-8000-0000000000c5','00000000-0000-4000-8000-0000000000c2','00000000-0000-4000-8000-0000000000c3'));
RAISE EXCEPTION 'SIM_RESULT %', r;
END
$sim$;