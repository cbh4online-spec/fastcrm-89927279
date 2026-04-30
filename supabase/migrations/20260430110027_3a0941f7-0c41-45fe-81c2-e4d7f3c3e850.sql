-- Backfill specs for Acqua Soft from its source OCR document
DO $$
DECLARE
  v_product_id uuid := 'd623712a-f024-48bc-9e8f-e6d787c97ff8';
  v_workspace_id uuid;
  v_struct jsonb;
  v_order int := 0;
  v_claim text;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM products WHERE id = v_product_id;
  SELECT ocr_structured_data INTO v_struct FROM product_ocr_documents
    WHERE id = '84c5d0b6-cd26-425b-b8eb-31d179a445c3';

  IF v_workspace_id IS NULL OR v_struct IS NULL THEN
    RAISE NOTICE 'Skipping: missing product or OCR doc';
    RETURN;
  END IF;

  -- avoid duplicates
  DELETE FROM product_spec_attributes WHERE product_id = v_product_id;

  -- Identificação
  INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, unit, spec_group, display_order)
  SELECT v_workspace_id, v_product_id, k, v, NULL, 'Identificação', row_number() OVER () - 1 + v_order
  FROM (VALUES
    ('EAN',           v_struct->'identification'->>'ean'),
    ('SKU',           v_struct->'identification'->>'sku'),
    ('Volume',        v_struct->'identification'->>'volume'),
    ('Unidade',       v_struct->'identification'->>'unit'),
    ('País de origem',v_struct->'identification'->>'origin_country'),
    ('Distribuidor', v_struct->'identification'->>'distributor')
  ) AS t(k,v)
  WHERE v IS NOT NULL AND length(trim(v)) > 0;
  v_order := (SELECT COALESCE(max(display_order),-1)+1 FROM product_spec_attributes WHERE product_id = v_product_id);

  -- Geral
  INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, unit, spec_group, display_order)
  SELECT v_workspace_id, v_product_id, k, v, NULL, 'Geral', row_number() OVER () - 1 + v_order
  FROM (VALUES
    ('Marca',        v_struct->'general'->>'brand'),
    ('Linha',        v_struct->'general'->>'product_line'),
    ('Categoria',    v_struct->'general'->>'category'),
    ('Subcategoria', v_struct->'general'->>'subcategory'),
    ('Tipo',         v_struct->'general'->>'product_type')
  ) AS t(k,v)
  WHERE v IS NOT NULL AND length(trim(v)) > 0;
  v_order := (SELECT COALESCE(max(display_order),-1)+1 FROM product_spec_attributes WHERE product_id = v_product_id);

  -- Composição
  IF (v_struct->'composition'->>'ingredients') IS NOT NULL THEN
    INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, spec_group, display_order)
    VALUES (v_workspace_id, v_product_id, 'Ingredientes', v_struct->'composition'->>'ingredients', 'Composição', v_order);
    v_order := v_order + 1;
  END IF;

  FOR v_claim IN SELECT jsonb_array_elements_text(COALESCE(v_struct->'composition'->'claims','[]'::jsonb)) LOOP
    INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, spec_group, display_order)
    VALUES (v_workspace_id, v_product_id, 'Claim ' || (v_order::text), v_claim, 'Composição', v_order);
    v_order := v_order + 1;
  END LOOP;

  -- Utilização
  INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, spec_group, display_order)
  SELECT v_workspace_id, v_product_id, k, v, 'Utilização', row_number() OVER () - 1 + v_order
  FROM (VALUES
    ('Instruções', v_struct->'usage'->>'instructions'),
    ('Precauções', v_struct->'usage'->>'precautions')
  ) AS t(k,v)
  WHERE v IS NOT NULL AND length(trim(v)) > 0;
  v_order := (SELECT COALESCE(max(display_order),-1)+1 FROM product_spec_attributes WHERE product_id = v_product_id);

  -- Comercial
  INSERT INTO product_spec_attributes (workspace_id, product_id, spec_key, spec_value, spec_group, display_order)
  SELECT v_workspace_id, v_product_id, k, v, 'Comercial', row_number() OVER () - 1 + v_order
  FROM (VALUES
    ('Posicionamento',  v_struct->'commercial'->>'positioning'),
    ('Cliente ideal',   v_struct->'commercial'->>'ideal_customer'),
    ('Notas sensoriais',v_struct->'commercial'->>'sensory_notes'),
    ('Notas olfativas', v_struct->'commercial'->>'olfactory_notes')
  ) AS t(k,v)
  WHERE v IS NOT NULL AND length(trim(v)) > 0;
END $$;