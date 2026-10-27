ALTER TABLE public.fastmatch_profiles ADD COLUMN IF NOT EXISTS reputation_rating_sum numeric NOT NULL DEFAULT 0;
-- Initialise the new authoritative sum and repair the derived aggregate together.
UPDATE public.fastmatch_profiles p SET reputation_rating_sum = a.rating_sum, reputation_count = a.review_count, reputation_score = CASE WHEN a.review_count = 0 THEN 5.0 ELSE round(a.rating_sum / a.review_count, 1) END FROM (SELECT p0.id, coalesce(sum(r.rating),0)::numeric AS rating_sum, count(r.id)::integer AS review_count FROM public.fastmatch_profiles p0 LEFT JOIN public.fastmatch_reputation_reviews r ON r.reviewed_profile_id=p0.id GROUP BY p0.id) a WHERE p.id=a.id;

CREATE OR REPLACE FUNCTION public.fastmatch_protect_reputation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  -- Only trusted table-owner code (including the aggregate trigger) may write aggregates.
  IF current_user <> pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='public.fastmatch_profiles'::regclass)) THEN
    IF TG_OP='INSERT' THEN
      IF NEW.reputation_score <> 5.0 OR NEW.reputation_count <> 0 OR NEW.reputation_rating_sum <> 0 THEN RAISE EXCEPTION 'A reputação é calculada pelas avaliações' USING ERRCODE='42501'; END IF;
    ELSIF NEW.reputation_score IS DISTINCT FROM OLD.reputation_score OR NEW.reputation_count IS DISTINCT FROM OLD.reputation_count OR NEW.reputation_rating_sum IS DISTINCT FROM OLD.reputation_rating_sum THEN
      RAISE EXCEPTION 'A reputação é calculada pelas avaliações' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fastmatch_protect_reputation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fastmatch_protect_reputation BEFORE INSERT OR UPDATE ON public.fastmatch_profiles FOR EACH ROW EXECUTE FUNCTION public.fastmatch_protect_reputation();

CREATE OR REPLACE FUNCTION public.fastmatch_validate_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_connection public.fastmatch_connections%ROWTYPE; v_reviewer public.fastmatch_profiles%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.reviewed_profile_id IS DISTINCT FROM OLD.reviewed_profile_id OR NEW.reviewer_profile_id IS DISTINCT FROM OLD.reviewer_profile_id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.connection_id IS DISTINCT FROM OLD.connection_id) THEN
    RAISE EXCEPTION 'A ligação e os participantes da avaliação não podem ser alterados' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_reviewer FROM public.fastmatch_profiles WHERE id=NEW.reviewer_profile_id;
  SELECT * INTO v_connection FROM public.fastmatch_connections WHERE id=NEW.connection_id;
  IF v_reviewer.id IS NULL OR v_connection.id IS NULL OR NEW.reviewed_profile_id=NEW.reviewer_profile_id OR NOT ((v_connection.profile_a_id=NEW.reviewer_profile_id AND v_connection.profile_b_id=NEW.reviewed_profile_id) OR (v_connection.profile_b_id=NEW.reviewer_profile_id AND v_connection.profile_a_id=NEW.reviewed_profile_id)) OR NEW.workspace_id<>v_reviewer.workspace_id THEN
    RAISE EXCEPTION 'Avaliação inválida para esta ligação' USING ERRCODE='42501';
  END IF;
  IF auth.uid() IS NOT NULL AND (v_reviewer.user_id<>auth.uid() OR NOT public.is_workspace_member(auth.uid(),NEW.workspace_id)) AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem autorização para avaliar' USING ERRCODE='42501';
  END IF;
  -- Row lock before review mutation; the arithmetic aggregate below is concurrency-safe.
  PERFORM id FROM public.fastmatch_profiles WHERE id=NEW.reviewed_profile_id FOR UPDATE;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.fastmatch_validate_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fastmatch_validate_review BEFORE INSERT OR UPDATE ON public.fastmatch_reputation_reviews FOR EACH ROW EXECUTE FUNCTION public.fastmatch_validate_review();

CREATE OR REPLACE FUNCTION public.fastmatch_apply_review_aggregate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile uuid; v_delta numeric; v_count_delta integer;
BEGIN
  IF TG_OP='DELETE' THEN v_profile:=OLD.reviewed_profile_id; v_delta:=-OLD.rating; v_count_delta:=-1;
  ELSIF TG_OP='INSERT' THEN v_profile:=NEW.reviewed_profile_id; v_delta:=NEW.rating; v_count_delta:=1;
  ELSE v_profile:=NEW.reviewed_profile_id; v_delta:=NEW.rating-OLD.rating; v_count_delta:=0;
  END IF;
  UPDATE public.fastmatch_profiles SET
    reputation_rating_sum=reputation_rating_sum+v_delta,
    reputation_count=reputation_count+v_count_delta,
    reputation_score=CASE WHEN reputation_count+v_count_delta=0 THEN 5.0 ELSE round((reputation_rating_sum+v_delta)/(reputation_count+v_count_delta),1) END
  WHERE id=v_profile;
  RETURN coalesce(NEW,OLD);
END; $$;
REVOKE ALL ON FUNCTION public.fastmatch_apply_review_aggregate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fastmatch_apply_review_aggregate AFTER INSERT OR UPDATE OR DELETE ON public.fastmatch_reputation_reviews FOR EACH ROW EXECUTE FUNCTION public.fastmatch_apply_review_aggregate();
COMMENT ON COLUMN public.fastmatch_profiles.reputation_rating_sum IS 'Authoritative review sum maintained atomically by review triggers; never write from client';

CREATE OR REPLACE FUNCTION public.can_read_event_catalog() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id=auth.uid() AND wm.role::text IN ('owner','admin','agency')));
$$;
REVOKE ALL ON FUNCTION public.can_read_event_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_event_catalog() TO authenticated, service_role;
ALTER POLICY "Super admins can read event_registry" ON public.event_registry USING ((SELECT public.can_read_event_catalog()));
GRANT SELECT ON public.event_registry TO authenticated;
