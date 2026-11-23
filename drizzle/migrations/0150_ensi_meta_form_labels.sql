CREATE OR REPLACE FUNCTION public.ensi_answer_label(p_field text, p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO public AS $$
  SELECT CASE p_field
    WHEN 'edicao' THEN CASE p_value WHEN 'lisboa' THEN 'Lisboa - 24 e 25 de janeiro de 2027' WHEN 'porto' THEN 'Porto - 17 e 18 de janeiro de 2027' WHEN 'a_decidir' THEN 'Ainda não decidi' ELSE p_value END
    WHEN 'presencial' THEN CASE p_value WHEN 'sim' THEN 'Sim' WHEN 'a_confirmar' THEN 'A confirmar' WHEN 'nao' THEN 'Não' ELSE p_value END
    WHEN 'atividade' THEN CASE p_value WHEN 'inicio' THEN 'Pretendo iniciar atividade nesta área' WHEN 'cabeleireiro' THEN 'Cabeleireiro(a)' WHEN 'estetica' THEN 'Estética' WHEN 'saude' THEN 'Saúde' WHEN 'outra' THEN 'Outra' ELSE p_value END
    ELSE p_value END
$$;

CREATE OR REPLACE FUNCTION public.ensi_question_label(p_field text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO public AS $$
  SELECT CASE p_field
    WHEN 'edicao' THEN 'Qual a edição que pretende frequentar?'
    WHEN 'presencial' THEN 'Tem disponibilidade para assistir presencialmente nas datas indicadas?'
    WHEN 'atividade' THEN 'Qual é a sua atividade profissional?'
    WHEN 'full_name' THEN 'Nome' WHEN 'email' THEN 'Email' WHEN 'phone_number' THEN 'Telefone'
    ELSE p_field END
$$;

CREATE OR REPLACE FUNCTION public.ensi_form_answers_text(p_raw jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO public AS $$
  SELECT 'Respostas do formulário Meta ENSI:' || coalesce(string_agg(
    E'\n\n' || public.ensi_question_label(f->>'name') || E'\n' ||
    coalesce((SELECT string_agg(public.ensi_answer_label(f->>'name', v), ', ') FROM jsonb_array_elements_text(coalesce(f->'values','[]'::jsonb)) v), ''),
    '' ORDER BY CASE f->>'name' WHEN 'full_name' THEN 1 WHEN 'email' THEN 2 WHEN 'phone_number' THEN 3 WHEN 'edicao' THEN 4 WHEN 'presencial' THEN 5 WHEN 'atividade' THEN 6 ELSE 7 END), '')
  FROM jsonb_array_elements(coalesce(p_raw->'field_data','[]'::jsonb)) f
$$;

CREATE OR REPLACE FUNCTION public.ensi_set_lead_form_fields(p_workspace uuid, p_lead uuid, p_raw jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE f jsonb; v_field uuid; v_val text;
BEGIN
  FOR f IN SELECT * FROM jsonb_array_elements(coalesce(p_raw->'field_data','[]'::jsonb)) LOOP
    IF f->>'name' NOT IN ('edicao','presencial','atividade') THEN CONTINUE; END IF;
    SELECT id INTO v_field FROM public.custom_fields WHERE workspace_id = p_workspace AND entity_type='lead'
      AND internal_name = 'ensi_' || (f->>'name') AND coalesce(is_archived,false) = false LIMIT 1;
    IF v_field IS NULL THEN CONTINUE; END IF;
    SELECT string_agg(public.ensi_answer_label(f->>'name', v), ', ') INTO v_val FROM jsonb_array_elements_text(coalesce(f->'values','[]'::jsonb)) v;
    IF v_val IS NULL THEN CONTINUE; END IF;
    UPDATE public.custom_field_values SET value = to_jsonb(v_val), updated_at = now() WHERE custom_field_id = v_field AND entity_id = p_lead;
    IF NOT FOUND THEN
      INSERT INTO public.custom_field_values (custom_field_id, entity_id, value, origin) VALUES (v_field, p_lead, to_jsonb(v_val), 'import');
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.ensi_set_lead_form_fields(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensi_set_lead_form_fields(uuid, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.ensi_meta_leads_fill_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND NEW.form_id = '29967420322844561' THEN
    PERFORM public.ensi_set_lead_form_fields(NEW.workspace_id, NEW.lead_id, NEW.raw_payload_json);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ensi_meta_leads_fill_fields ON public.meta_leads;
CREATE TRIGGER trg_ensi_meta_leads_fill_fields AFTER INSERT ON public.meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.ensi_meta_leads_fill_fields();