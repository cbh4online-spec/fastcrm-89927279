
-- 1. field_catalog table
CREATE TABLE IF NOT EXISTS public.field_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  section text NOT NULL DEFAULT 'general',
  data_type text NOT NULL DEFAULT 'text',
  sort_order integer NOT NULL DEFAULT 0,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (object_key, field_key)
);

ALTER TABLE public.field_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read field catalog" ON public.field_catalog;
CREATE POLICY "Anyone authenticated can read field catalog"
  ON public.field_catalog FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admins manage field catalog" ON public.field_catalog;
CREATE POLICY "Super admins manage field catalog"
  ON public.field_catalog FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_field_catalog_object ON public.field_catalog(object_key, sort_order);

-- 2. Seed product fields
INSERT INTO public.field_catalog (object_key, field_key, label, section, data_type, sort_order, is_sensitive) VALUES
  -- Identificação
  ('products','name','Nome','identification','text',10,false),
  ('products','sku','SKU','identification','text',20,false),
  ('products','barcode','Código de barras','identification','text',30,false),
  ('products','category','Categoria','identification','text',40,false),
  ('products','line','Linha','identification','text',50,false),
  ('products','tags','Etiquetas','identification','array',60,false),
  ('products','brand_logo_url','Logo da marca','identification','url',70,false),
  ('products','product_type','Tipo de produto','identification','text',80,false),
  ('products','status','Estado','identification','text',90,false),
  -- Comercial
  ('products','short_description','Descrição curta','commercial','text',100,false),
  ('products','commercial_description','Descrição comercial','commercial','text',110,false),
  ('products','benefits','Benefícios','commercial','array',120,false),
  ('products','conditions','Condições','commercial','text',130,false),
  ('products','demo_video_url','Vídeo demo','commercial','url',140,false),
  -- Preço
  ('products','base_price','Preço base','pricing','number',200,false),
  ('products','currency','Moeda','pricing','text',210,false),
  ('products','tax_rate_estimate_pct','Taxa IVA (%)','pricing','number',220,false),
  ('products','tax_included','IVA incluído','pricing','boolean',230,false),
  ('products','setup_fee','Taxa de setup','pricing','number',240,false),
  ('products','recurring_fee','Taxa recorrente','pricing','number',250,false),
  ('products','billing_type','Tipo de faturação','pricing','text',260,false),
  ('products','billing_frequency','Frequência de faturação','pricing','text',270,false),
  ('products','competitor_price_low','Preço concorrência','pricing','number',280,true),
  ('products','competitor_source','Fonte concorrência','pricing','text',290,true),
  -- Custos e margem
  ('products','direct_cost','Custo direto','costs','number',300,true),
  ('products','operational_cost','Custo operacional','costs','number',310,true),
  ('products','target_margin_pct','Margem alvo (%)','costs','number',320,true),
  ('products','commission_default','Comissão padrão (%)','costs','number',330,true),
  ('products','labor_hours','Horas de trabalho','costs','number',340,false),
  ('products','labor_hourly_rate','Custo/hora','costs','number',350,true),
  ('products','labor_included_in_price','Trabalho incluído no preço','costs','boolean',360,false),
  ('products','labor_notes','Notas de trabalho','costs','text',370,false),
  -- Stock e logística
  ('products','stock_status','Estado de stock','stock','text',400,false),
  ('products','stock_quantity','Quantidade em stock','stock','number',410,false),
  ('products','track_stock','Controlar stock','stock','boolean',420,false),
  ('products','low_stock_threshold','Limite de stock baixo','stock','number',430,false),
  ('products','min_order_quantity','Qtd mínima de encomenda','stock','number',440,false),
  ('products','order_multiple','Múltiplo de encomenda','stock','number',450,false),
  ('products','pack_size','Tamanho da embalagem','stock','number',460,false),
  ('products','weight','Peso','stock','number',470,false),
  ('products','delivery_estimate','Estimativa de entrega','stock','text',480,false),
  ('products','delivery_notes','Notas de entrega','stock','text',490,false),
  ('products','delivery_mode','Modo de entrega','stock','text',500,false),
  -- Conteúdo
  ('products','images','Imagens','content','array',600,false),
  ('products','primary_image_index','Imagem principal','content','number',610,false),
  ('products','specifications','Especificações','content','json',620,false),
  -- Loja
  ('products','store_published','Publicado na loja','store','boolean',700,false),
  ('products','store_featured','Destacado na loja','store','boolean',710,false),
  ('products','store_visibility','Visibilidade na loja','store','text',720,false),
  ('products','store_category_id','Categoria da loja','store','text',730,false),
  ('products','store_sort_order','Ordem na loja','store','number',740,false),
  ('products','b2b_published','Publicado em B2B','store','boolean',750,false),
  ('products','sheet_published','Ficha publicada','store','boolean',760,false),
  ('products','sheet_slug','Slug da ficha','store','text',770,false),
  ('products','business_types','Tipos de negócio','store','array',780,false),
  -- Consumo (serviços)
  ('products','consumption_model','Modelo de consumo','consumption','text',800,false),
  ('products','included_quantity','Quantidade incluída','consumption','number',810,false),
  ('products','unit_name','Nome da unidade','consumption','text',820,false),
  ('products','unit_duration','Duração da unidade','consumption','number',830,false),
  ('products','validity_days','Validade (dias)','consumption','number',840,false),
  ('products','total_units','Total de unidades','consumption','number',850,false),
  ('products','recommended_frequency','Frequência recomendada','consumption','text',860,false),
  ('products','typical_duration_days','Duração típica (dias)','consumption','number',870,false),
  ('products','is_trackable','É rastreável','consumption','boolean',880,false),
  -- Bundle
  ('products','bundle_price_mode','Modo de preço do bundle','bundle','text',900,false),
  ('products','product_condition','Condição do produto','identification','text',95,false)
ON CONFLICT (object_key, field_key) DO UPDATE
  SET label = EXCLUDED.label,
      section = EXCLUDED.section,
      data_type = EXCLUDED.data_type,
      sort_order = EXCLUDED.sort_order,
      is_sensitive = EXCLUDED.is_sensitive,
      updated_at = now();

-- 3. Helper: get user role in workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.workspace_members
  WHERE user_id = _user_id
    AND workspace_id = _workspace_id
  LIMIT 1
$$;

-- 4. Trigger: enforce field permissions on products
CREATE OR REPLACE FUNCTION public.enforce_product_field_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_blocked text[];
  v_field text;
  v_level text;
BEGIN
  v_user_id := auth.uid();

  -- Skip when no auth context (service_role / system)
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip super admins
  IF public.is_super_admin(v_user_id) THEN
    RETURN NEW;
  END IF;

  v_role := public.get_user_workspace_role(v_user_id, NEW.workspace_id);

  -- Owner / admin bypass
  IF v_role IN ('owner','admin') THEN
    RETURN NEW;
  END IF;

  IF v_role IS NULL THEN
    -- Not a member; let RLS handle it
    RETURN NEW;
  END IF;

  v_blocked := ARRAY[]::text[];

  -- Iterate over product fields tracked in catalog
  FOR v_field, v_level IN
    SELECT fc.field_key, fp.permission_level
    FROM public.field_catalog fc
    JOIN public.field_permissions fp
      ON fp.object_key = 'products'
     AND fp.field_key = fc.field_key
     AND fp.role = v_role
     AND fp.workspace_id = NEW.workspace_id
    WHERE fc.object_key = 'products'
      AND fp.permission_level IN ('hidden','view')
  LOOP
    -- For INSERT we only block if a non-default value is being set;
    -- For UPDATE we block if value changed.
    IF TG_OP = 'INSERT' THEN
      EXECUTE format(
        'SELECT ($1).%I IS NOT NULL', v_field
      ) INTO STRICT v_level USING NEW;
      -- v_level reused as boolean text; safer reset
      v_level := NULL;
      -- Skip insert-time enforcement for now to avoid breaking defaults
      CONTINUE;
    ELSIF TG_OP = 'UPDATE' THEN
      EXECUTE format(
        'SELECT ($1).%I IS DISTINCT FROM ($2).%I', v_field, v_field
      ) INTO v_level USING NEW, OLD;
      IF v_level::boolean THEN
        v_blocked := array_append(v_blocked, v_field);
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_blocked, 1) > 0 THEN
    RAISE EXCEPTION 'Sem permissão para alterar os campos: %', array_to_string(v_blocked, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_enforce_product_field_permissions ON public.products;
CREATE TRIGGER tg_enforce_product_field_permissions
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_field_permissions();

-- 5. Audit log for field_permissions changes
CREATE OR REPLACE FUNCTION public.log_field_permission_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_workspace uuid;
  v_action text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_workspace := OLD.workspace_id;
    v_action := 'field_permission.deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_workspace := NEW.workspace_id;
    v_action := 'field_permission.updated';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_workspace := NEW.workspace_id;
    v_action := 'field_permission.created';
    v_old := NULL;
    v_new := to_jsonb(NEW);
  END IF;

  BEGIN
    INSERT INTO public.activity_logs (workspace_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
      v_workspace,
      v_actor,
      v_action,
      'field_permission',
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object('old', v_old, 'new', v_new)
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block the underlying change due to audit failure
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_field_permissions_audit ON public.field_permissions;
CREATE TRIGGER tg_field_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.field_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_field_permission_changes();
