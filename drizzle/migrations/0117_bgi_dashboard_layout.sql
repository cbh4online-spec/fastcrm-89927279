ALTER TABLE public.workspace_bgi_settings
  ADD COLUMN IF NOT EXISTS indicator_order text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hidden_indicators text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.bgi_settings_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT (NEW.template_ids <@ ARRAY['commerce','education','saas','services','real_estate','custom']::text[]) THEN
    RAISE EXCEPTION 'Modelo de negócio inválido';
  END IF;
  NEW.indicator_order := ARRAY(SELECT x FROM (SELECT DISTINCT ON (x) x, o FROM unnest(COALESCE(NEW.indicator_order,'{}')) WITH ORDINALITY t(x,o) WHERE x ~ '^[a-z0-9_]{1,64}$' ORDER BY x, o) s ORDER BY o);
  NEW.hidden_indicators := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(NEW.hidden_indicators,'{}')) t(x) WHERE x ~ '^[a-z0-9_]{1,64}$');
  IF cardinality(NEW.indicator_order) > 100 OR cardinality(NEW.hidden_indicators) > 100 THEN
    RAISE EXCEPTION 'Demasiados indicadores';
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;