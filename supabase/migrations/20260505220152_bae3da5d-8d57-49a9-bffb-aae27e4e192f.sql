-- Seed template "Envio de Produto" para todos os workspaces existentes (idempotente).
-- Cria 1 communication_template canónico por workspace + entrada em whatsapp_templates_meta.

DO $$
DECLARE
  ws RECORD;
  v_template_id uuid;
  v_creator uuid;
  v_template_body text := 'Olá {{contact_name}}, envio-lhe a sugestão que pode fazer sentido para si:

📦 *{{product_name}}*

{{product_short_description}}

💶 Preço: {{product_price}}

🔗 {{product_link}}

Se quiser, posso também enviar uma sugestão complementar.';
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- Já existe?
    SELECT id INTO v_template_id
    FROM public.communication_templates
    WHERE workspace_id = ws.id
      AND channel = 'whatsapp'
      AND name = 'Envio de Produto'
    LIMIT 1;

    IF v_template_id IS NULL THEN
      -- creator: primeiro membro do workspace
      SELECT user_id INTO v_creator
      FROM public.workspace_members
      WHERE workspace_id = ws.id
      ORDER BY created_at ASC
      LIMIT 1;

      IF v_creator IS NOT NULL THEN
        INSERT INTO public.communication_templates (
          workspace_id, name, channel, language, body, tone, is_active, created_by, structure_type
        )
        VALUES (
          ws.id, 'Envio de Produto', 'whatsapp', 'pt', v_template_body,
          'professional', true, v_creator, 'custom'
        )
        RETURNING id INTO v_template_id;

        INSERT INTO public.whatsapp_templates_meta (
          template_id, workspace_id, category, country, suggested_variables
        ) VALUES (
          v_template_id, ws.id, 'sales', 'PT',
          '["contact_name","product_name","product_short_description","product_price","product_link"]'::jsonb
        )
        ON CONFLICT (template_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Trigger para auto-seed quando se criar um novo workspace
CREATE OR REPLACE FUNCTION public.seed_whatsapp_product_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_creator uuid;
  v_body text := 'Olá {{contact_name}}, envio-lhe a sugestão que pode fazer sentido para si:

📦 *{{product_name}}*

{{product_short_description}}

💶 Preço: {{product_price}}

🔗 {{product_link}}

Se quiser, posso também enviar uma sugestão complementar.';
BEGIN
  -- creator: o owner do workspace (NEW.owner_id se existir, senão NULL)
  BEGIN
    v_creator := NEW.owner_id;
  EXCEPTION WHEN OTHERS THEN
    v_creator := NULL;
  END;

  IF v_creator IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.communication_templates (
    workspace_id, name, channel, language, body, tone, is_active, created_by, structure_type
  ) VALUES (
    NEW.id, 'Envio de Produto', 'whatsapp', 'pt', v_body,
    'professional', true, v_creator, 'custom'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO public.whatsapp_templates_meta (
      template_id, workspace_id, category, country, suggested_variables
    ) VALUES (
      v_template_id, NEW.id, 'sales', 'PT',
      '["contact_name","product_name","product_short_description","product_price","product_link"]'::jsonb
    )
    ON CONFLICT (template_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_whatsapp_product_template ON public.workspaces;
CREATE TRIGGER trg_seed_whatsapp_product_template
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.seed_whatsapp_product_template();