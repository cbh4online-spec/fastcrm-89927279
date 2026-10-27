-- Run against an isolated PostgreSQL database after migrations 0088/0089.
INSERT INTO public.fastmatch_profiles(id,workspace_id,user_id) VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000101');
DO $$ DECLARE i integer; p uuid; w uuid; c uuid; BEGIN
 FOR i IN 2..12 LOOP
  p:=('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  w:=('00000000-0000-4000-8001-'||lpad(i::text,12,'0'))::uuid;
  c:=('00000000-0000-4000-8002-'||lpad(i::text,12,'0'))::uuid;
  INSERT INTO public.fastmatch_profiles(id,workspace_id,user_id) VALUES(p,w,p);
  INSERT INTO public.fastmatch_connections(id,workspace_id,profile_a_id,profile_b_id) VALUES(c,w,p,'00000000-0000-4000-8000-000000000001');
  INSERT INTO public.fastmatch_reputation_reviews(workspace_id,connection_id,reviewer_profile_id,reviewed_profile_id,rating) VALUES(w,c,p,'00000000-0000-4000-8000-000000000001',CASE WHEN i=12 THEN 2 ELSE 5 END);
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.fastmatch_profiles WHERE id='00000000-0000-4000-8000-000000000001' AND reputation_score=4.7 AND reputation_count=11 AND reputation_rating_sum=52) THEN RAISE EXCEPTION 'Expected 4.7 / 11 from all reviews'; END IF;
END $$;

SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  UPDATE public.fastmatch_profiles SET reputation_score=2,reputation_count=1 WHERE id='00000000-0000-4000-8000-000000000001';
  RAISE EXCEPTION 'Direct reputation write was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.fastmatch_profiles SET company_name='Allowed edit' WHERE id='00000000-0000-4000-8000-000000000001';
END $$;
RESET ROLE;

DO $$ BEGIN
 UPDATE public.fastmatch_reputation_reviews SET rating=5 WHERE reviewer_profile_id='00000000-0000-4000-8000-000000000012';
 IF NOT EXISTS(SELECT 1 FROM public.fastmatch_profiles WHERE id='00000000-0000-4000-8000-000000000001' AND reputation_score=5 AND reputation_count=11) THEN RAISE EXCEPTION 'Rating edits not included'; END IF;
 DELETE FROM public.fastmatch_reputation_reviews WHERE reviewed_profile_id='00000000-0000-4000-8000-000000000001';
 IF NOT EXISTS(SELECT 1 FROM public.fastmatch_profiles WHERE id='00000000-0000-4000-8000-000000000001' AND reputation_score=5 AND reputation_count=0 AND reputation_rating_sum=0) THEN RAISE EXCEPTION 'Zero-review default broken'; END IF;
 BEGIN
  INSERT INTO public.fastmatch_reputation_reviews(workspace_id,connection_id,reviewer_profile_id,reviewed_profile_id,rating) VALUES('00000000-0000-4000-8001-000000000002','00000000-0000-4000-8002-000000000002','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003',5);
  RAISE EXCEPTION 'Unrelated reviewed profile allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;