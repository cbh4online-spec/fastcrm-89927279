
-- 1) Normalizar dados existentes
UPDATE public.profile_field_permissions
SET
  sales_function = lower(btrim(sales_function)),
  page_key       = lower(btrim(page_key)),
  field_key      = lower(btrim(field_key));

UPDATE public.profile_menu_permissions
SET
  sales_function = lower(btrim(sales_function)),
  menu_key       = lower(btrim(menu_key));

-- 2) Remover duplicados criados por variações (manter o mais recente)
DELETE FROM public.profile_field_permissions a
USING public.profile_field_permissions b
WHERE a.ctid < b.ctid
  AND a.workspace_id   = b.workspace_id
  AND a.sales_function = b.sales_function
  AND a.page_key       = b.page_key
  AND a.field_key      = b.field_key;

DELETE FROM public.profile_menu_permissions a
USING public.profile_menu_permissions b
WHERE a.ctid < b.ctid
  AND a.workspace_id   = b.workspace_id
  AND a.sales_function = b.sales_function
  AND a.menu_key       = b.menu_key;

-- 3) Trigger de normalização (defense in depth)
CREATE OR REPLACE FUNCTION public.fn_normalize_profile_field_perms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.sales_function := lower(btrim(NEW.sales_function));
  NEW.page_key       := lower(btrim(NEW.page_key));
  NEW.field_key      := lower(btrim(NEW.field_key));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_normalize_profile_menu_perms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.sales_function := lower(btrim(NEW.sales_function));
  NEW.menu_key       := lower(btrim(NEW.menu_key));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_profile_field_perms ON public.profile_field_permissions;
CREATE TRIGGER trg_normalize_profile_field_perms
  BEFORE INSERT OR UPDATE ON public.profile_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_profile_field_perms();

DROP TRIGGER IF EXISTS trg_normalize_profile_menu_perms ON public.profile_menu_permissions;
CREATE TRIGGER trg_normalize_profile_menu_perms
  BEFORE INSERT OR UPDATE ON public.profile_menu_permissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_profile_menu_perms();

-- 4) CHECK constraints (não-vazio)
ALTER TABLE public.profile_field_permissions
  DROP CONSTRAINT IF EXISTS chk_pfp_keys_not_empty;
ALTER TABLE public.profile_field_permissions
  ADD CONSTRAINT chk_pfp_keys_not_empty
  CHECK (
    length(sales_function) > 0
    AND length(page_key) > 0
    AND length(field_key) > 0
  );

ALTER TABLE public.profile_menu_permissions
  DROP CONSTRAINT IF EXISTS chk_pmp_keys_not_empty;
ALTER TABLE public.profile_menu_permissions
  ADD CONSTRAINT chk_pmp_keys_not_empty
  CHECK (
    length(sales_function) > 0
    AND length(menu_key) > 0
  );

-- 5) UNIQUE composto (suporta upsert do código)
ALTER TABLE public.profile_field_permissions
  DROP CONSTRAINT IF EXISTS uq_profile_field_permissions;
ALTER TABLE public.profile_field_permissions
  ADD CONSTRAINT uq_profile_field_permissions
  UNIQUE (workspace_id, sales_function, page_key, field_key);

ALTER TABLE public.profile_menu_permissions
  DROP CONSTRAINT IF EXISTS uq_profile_menu_permissions;
ALTER TABLE public.profile_menu_permissions
  ADD CONSTRAINT uq_profile_menu_permissions
  UNIQUE (workspace_id, sales_function, menu_key);
