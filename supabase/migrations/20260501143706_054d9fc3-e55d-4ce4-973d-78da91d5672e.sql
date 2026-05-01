-- =========================================================================
-- compute_partner_price — passa a calcular PVP recomendado quando NULL.
--
-- Regra (B2B):
--   PVP_sem_IVA   = base_price × 1.50      (50% markup sobre o preço B2B)
--   PVP_com_IVA   = PVP_sem_IVA × (1 + IVA/100)
--   IVA           = COALESCE(products.tax_rate_estimate_pct, 23)
--
-- Margem reportada ao parceiro:
--   gross_margin_pct = ((PVP_sem_IVA - price_net) / PVP_sem_IVA) × 100
--   (margem sobre PVP, convenção PT — comparando valores ambos sem IVA)
--
-- PVP definido manualmente (em products ou em partner_price_list_items)
-- mantém SEMPRE prioridade — só calculamos quando está NULL ou 0.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.compute_partner_price(
  p_workspace_id uuid,
  p_product_id uuid,
  p_partner_account_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS TABLE(
  base_price numeric,
  price_net numeric,
  price_source text,
  pvp_recommended numeric,
  gross_margin_pct numeric,
  tier_applied text,
  list_applied text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_base_price NUMERIC;
  v_price_net NUMERIC;
  v_price_source TEXT := 'base';
  v_pvp NUMERIC;
  v_pvp_manual BOOLEAN := false;       -- true quando PVP veio explícito
  v_tax_rate NUMERIC;                  -- IVA do produto (ou 23 default)
  v_pvp_net NUMERIC;                   -- PVP sem IVA, base do cálculo de margem
  v_margin NUMERIC;
  v_tier_name TEXT;
  v_list_name TEXT;
  v_list_id UUID;
  v_tier_id UUID;
  v_tier_discount NUMERIC;
BEGIN
  -- Carrega base_price, PVP manual (se existir) e taxa IVA do produto
  SELECT p.price, p.pvp_recommended, p.tax_rate_estimate_pct
    INTO v_base_price, v_pvp, v_tax_rate
  FROM products p
  WHERE p.id = p_product_id
    AND p.workspace_id = p_workspace_id;

  IF v_base_price IS NULL THEN RETURN; END IF;

  v_price_net := v_base_price;
  v_pvp_manual := (v_pvp IS NOT NULL AND v_pvp > 0);

  -- Conta de IVA: produto define, senão 23% (PT standard)
  v_tax_rate := COALESCE(v_tax_rate, 23);

  -- Conta da conta-parceiro: lista + tier
  SELECT pa.price_list_id, pa.partner_tier_id
    INTO v_list_id, v_tier_id
  FROM partner_accounts pa
  WHERE pa.id = p_partner_account_id
    AND pa.workspace_id = p_workspace_id;

  -- 1. Lista de preços (prioridade máxima)
  IF v_list_id IS NOT NULL THEN
    DECLARE
      v_list_pvp NUMERIC;
    BEGIN
      SELECT pli.price_net, pli.pvp_recommended, pl.name
        INTO v_price_net, v_list_pvp, v_list_name
      FROM partner_price_list_items pli
      JOIN partner_price_lists pl ON pl.id = pli.price_list_id
      WHERE pli.price_list_id = v_list_id
        AND pli.product_id = p_product_id
        AND pli.is_active = true
        AND pli.workspace_id = p_workspace_id
        AND (pli.valid_from IS NULL OR pli.valid_from <= now())
        AND (pli.valid_until IS NULL OR pli.valid_until >= now())
        AND p_quantity >= COALESCE(pli.min_qty, 1);

      IF FOUND THEN
        v_price_source := 'price_list';
        -- PVP da lista sobrepõe PVP do produto (e marca como manual)
        IF v_list_pvp IS NOT NULL AND v_list_pvp > 0 THEN
          v_pvp := v_list_pvp;
          v_pvp_manual := true;
        END IF;
      END IF;
    END;
  END IF;

  -- 2. Desconto por tier (fallback ao base)
  IF v_price_source = 'base' AND v_tier_id IS NOT NULL THEN
    SELECT pt.discount_percentage, pt.name
      INTO v_tier_discount, v_tier_name
    FROM partner_tiers pt
    WHERE pt.id = v_tier_id
      AND pt.is_active = true;

    IF v_tier_discount IS NOT NULL AND v_tier_discount > 0 THEN
      v_price_net := ROUND(v_base_price * (1 - v_tier_discount / 100), 2);
      v_price_source := 'tier_discount';
    END IF;
  END IF;

  IF v_tier_id IS NOT NULL AND v_tier_name IS NULL THEN
    SELECT pt.name INTO v_tier_name FROM partner_tiers pt WHERE pt.id = v_tier_id;
  END IF;

  -- 3. Cálculo automático de PVP recomendado (quando não vem manual).
  --    Base do cálculo = preço B2B do parceiro (price_net) — assim o PVP
  --    reflecte a realidade do parceiro, não o preço bruto do catálogo.
  IF NOT v_pvp_manual THEN
    v_pvp_net := ROUND(v_price_net * 1.50, 2);                     -- +50% margem
    v_pvp     := ROUND(v_pvp_net * (1 + v_tax_rate / 100), 2);     -- + IVA
  ELSE
    -- Para a margem, precisamos do PVP sem IVA. Assumimos que o PVP manual
    -- vem com IVA (convenção do produto: tax_included=true por defeito) e
    -- "desfazemos" o IVA para obter a base comparável com price_net.
    v_pvp_net := ROUND(v_pvp / (1 + v_tax_rate / 100), 2);
  END IF;

  -- 4. Margem reportada ao parceiro: PVP sem IVA vs price_net (ambos B2B base)
  IF v_pvp_net IS NOT NULL AND v_pvp_net > 0 THEN
    v_margin := ROUND(((v_pvp_net - v_price_net) / v_pvp_net) * 100, 2);
  END IF;

  RETURN QUERY SELECT
    v_base_price,
    v_price_net,
    v_price_source,
    v_pvp,
    v_margin,
    v_tier_name,
    v_list_name;
END;
$function$;