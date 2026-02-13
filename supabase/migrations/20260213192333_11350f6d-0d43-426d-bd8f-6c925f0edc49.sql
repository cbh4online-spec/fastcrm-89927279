-- Fix SECURITY DEFINER functions missing SET search_path

CREATE OR REPLACE FUNCTION public.auto_create_company_for_eni()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_company_id uuid;
BEGIN
  IF NEW.entity_type = 'eni' AND NEW.company_id IS NULL THEN
    SELECT id INTO new_company_id
    FROM public.companies
    WHERE workspace_id = NEW.workspace_id
      AND name = NEW.name
    LIMIT 1;
    
    IF new_company_id IS NULL THEN
      INSERT INTO public.companies (
        workspace_id, created_by, name, entity_type, tax_id, email, phone, address, city, postal_code
      ) VALUES (
        NEW.workspace_id, NEW.created_by, COALESCE(NEW.commercial_name, NEW.name), 'sole_proprietor',
        NEW.tax_id, NEW.email, NEW.phone, NEW.address, NEW.city, NEW.postal_code
      )
      RETURNING id INTO new_company_id;
    END IF;
    
    NEW.company_id := new_company_id;
    NEW.company := COALESCE(NEW.commercial_name, NEW.name);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_template_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.communication_templates 
  SET usage_count = usage_count + 1 
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_workspace_created_init_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.initialize_workspace_activity_profiles(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_workspace_activity_profiles(p_workspace_id uuid, p_created_by uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.activity_profiles (workspace_id, code, name, description, profile_type, icon, color, is_system, visible_fields, ai_context, created_by)
  VALUES
    (p_workspace_id, 'generico', 'Genérico', 'Perfil padrão para negócios gerais', 'generico', 'Briefcase', '#6366f1', true,
     '{"contacts": ["name", "email", "phone", "company", "job_title", "tags", "notes"], "companies": ["name", "email", "phone", "industry", "website", "address"]}',
     '{"terminology": {"client": "cliente", "deal": "oportunidade"}, "focus_areas": ["vendas", "relacionamento"]}',
     p_created_by),
    (p_workspace_id, 'formacao_educacao', 'Formação / Educação', 'Para escolas, formadores e instituições educativas', 'formacao_educacao', 'GraduationCap', '#10b981', true,
     '{"contacts": ["name", "email", "phone", "tipo_aluno", "cursos_inscritos", "nivel", "sessoes_realizadas", "sessoes_pendentes", "certificado"], "companies": ["name", "tipo_instituicao"]}',
     '{"terminology": {"client": "aluno", "deal": "matrícula", "product": "curso"}, "focus_areas": ["progresso", "sessões", "certificação", "abandono"]}',
     p_created_by),
    (p_workspace_id, 'produtos', 'Produtos', 'Para comércio e venda de produtos físicos ou digitais', 'produtos', 'Package', '#f59e0b', true,
     '{"contacts": ["name", "email", "phone", "produtos_comprados", "frequencia_compra", "ultima_compra", "margem_media", "valor_total_compras"], "companies": ["name", "categoria_cliente", "volume_compras"]}',
     '{"terminology": {"client": "cliente", "deal": "encomenda", "product": "produto"}, "focus_areas": ["recompra", "cross-sell", "bundles", "stock"]}',
     p_created_by),
    (p_workspace_id, 'servicos_financeiros', 'Serviços Financeiros', 'Para contabilistas, consultores fiscais e financeiros', 'servicos_financeiros', 'Calculator', '#3b82f6', true,
     '{"contacts": ["name", "email", "phone", "nif", "tipo_servico", "datas_fiscais", "documentos_associados", "renovacao_anual"], "companies": ["name", "nif", "regime_fiscal", "atividade_cae"]}',
     '{"terminology": {"client": "cliente", "deal": "serviço", "product": "serviço fiscal"}, "focus_areas": ["prazos legais", "obrigações fiscais", "renovações", "compliance"]}',
     p_created_by),
    (p_workspace_id, 'marketing_digital', 'Marketing Digital', 'Para agências e profissionais de marketing', 'marketing_digital', 'TrendingUp', '#ec4899', true,
     '{"contacts": ["name", "email", "phone", "servicos_contratados", "campanhas_ativas", "kpis_marketing", "relatorios_mensais"], "companies": ["name", "website", "redes_sociais", "budget_marketing"]}',
     '{"terminology": {"client": "cliente", "deal": "campanha", "product": "serviço"}, "focus_areas": ["performance", "ROI", "leads gerados", "otimização"]}',
     p_created_by),
    (p_workspace_id, 'avencas_contratos', 'Avenças / Contratos', 'Para serviços recorrentes e contratos de longo prazo', 'avencas_contratos', 'FileText', '#8b5cf6', true,
     '{"contacts": ["name", "email", "phone", "valor_mensal", "inicio_contrato", "fim_contrato", "sla", "renovacao_automatica"], "companies": ["name", "contratos_ativos", "valor_recorrente", "historico_renovacoes"]}',
     '{"terminology": {"client": "cliente", "deal": "contrato", "product": "serviço"}, "focus_areas": ["renovação", "churn", "receita recorrente", "SLA"]}',
     p_created_by),
    (p_workspace_id, 'servicos_profissionais', 'Serviços Profissionais', 'Para consultores, advogados e outros profissionais', 'servicos_profissionais', 'Briefcase', '#64748b', true,
     '{"contacts": ["name", "email", "phone", "tipo_cliente", "projetos_ativos", "horas_faturadas", "valor_hora"], "companies": ["name", "setor", "dimensao", "projetos_concluidos"]}',
     '{"terminology": {"client": "cliente", "deal": "projeto", "product": "serviço"}, "focus_areas": ["projetos", "horas", "faturação", "satisfação"]}',
     p_created_by);
END;
$function$;