
-- 1. Add config JSONB column to pipeline_stages
ALTER TABLE public.pipeline_stages 
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';

-- 2. Add code column to pipelines
ALTER TABLE public.pipelines 
  ADD COLUMN IF NOT EXISTS code text;

-- 3. Create function to provision mortgage pipeline for a workspace
CREATE OR REPLACE FUNCTION public.create_mortgage_pipeline_for_workspace(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pipeline_id uuid;
  v_stage_ids uuid[];
  v_sid uuid;
BEGIN
  -- Check if mortgage pipeline already exists for this workspace
  IF EXISTS (
    SELECT 1 FROM pipelines 
    WHERE workspace_id = p_workspace_id AND code = 'mortgage_journey'
  ) THEN
    RETURN;
  END IF;

  -- Create the pipeline
  INSERT INTO pipelines (workspace_id, name, type, description, is_default, code)
  VALUES (
    p_workspace_id,
    'Mortgage Journey / Crédito Habitação',
    'sales',
    'Pipeline completo de crédito habitação — do primeiro contacto à escritura',
    false,
    'mortgage_journey'
  )
  RETURNING id INTO v_pipeline_id;

  -- Insert 12 stages
  INSERT INTO pipeline_stages (pipeline_id, workspace_id, name, position, probability, color, expected_days, description, config)
  VALUES
    -- Phase: Preparation
    (v_pipeline_id, p_workspace_id, 'Inquiry / Lead', 0, 5, '#3b82f6', 3,
     'Registar interesse inicial e validar lead',
     '{"phase":"Preparation","objective":"Registar interesse inicial e validar lead","entry_criteria":["Lead criado"],"exit_criteria":["Nome, telefone e email preenchidos","Interesse confirmado"],"required_fields":["lead_source","full_name","phone","email","intent_type"],"default_tasks":["Fazer 1º contacto","Validar interesse e timing"],"blocked_if":["Sem contacto válido"],"next_stage_code":"research_budget","stage_code":"inquiry_lead"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Research & Budget', 1, 10, '#60a5fa', 5,
     'Definir enquadramento financeiro inicial',
     '{"phase":"Preparation","objective":"Definir enquadramento financeiro inicial","entry_criteria":["Lead validado"],"exit_criteria":["Orçamento preliminar definido","Capacidade financeira inicial registada"],"required_fields":["estimated_property_value","available_down_payment","monthly_income","monthly_fixed_expenses"],"default_tasks":["Enviar guia do processo","Recolher dados financeiros base","Agendar chamada de diagnóstico"],"blocked_if":["Sem rendimento mensal","Sem valor de entrada"],"next_stage_code":"credit_check","stage_code":"research_budget"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Credit Check', 2, 18, '#93c5fd', 4,
     'Avaliar situação de crédito',
     '{"phase":"Preparation","objective":"Avaliar situação de crédito","entry_criteria":["Dados base recolhidos"],"exit_criteria":["Estado de crédito classificado"],"required_fields":["credit_status","existing_loans","bank_defaults_flag"],"default_tasks":["Rever histórico financeiro","Identificar riscos ou bloqueios"],"blocked_if":["Informação financeira incompleta"],"next_stage_code":"agent_advisor_assigned","stage_code":"credit_check"}'::jsonb),

    -- Phase: Approval
    (v_pipeline_id, p_workspace_id, 'Agent / Advisor Assigned', 3, 25, '#f59e0b', 2,
     'Atribuir responsável pelo processo',
     '{"phase":"Approval","objective":"Atribuir responsável pelo processo","entry_criteria":["Crédito revisto"],"exit_criteria":["Consultor atribuído","Contacto inicial feito"],"required_fields":["owner_user_id","advisor_status"],"default_tasks":["Atribuir consultor","Criar plano de acompanhamento"],"blocked_if":["Sem owner atribuído"],"next_stage_code":"prequalification","stage_code":"agent_advisor_assigned"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Prequalification', 4, 35, '#fbbf24', 5,
     'Emitir estimativa inicial de capacidade de compra',
     '{"phase":"Approval","objective":"Emitir estimativa inicial de capacidade de compra","entry_criteria":["Consultor atribuído"],"exit_criteria":["Pré-qualificação emitida"],"required_fields":["prequalification_status","estimated_borrowing_power"],"default_tasks":["Calcular capacidade estimada","Enviar resumo ao cliente"],"blocked_if":["Sem dados financeiros mínimos"],"next_stage_code":"preapproval","stage_code":"prequalification"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Preapproval', 5, 50, '#fcd34d', 7,
     'Validar capacidade com base documental',
     '{"phase":"Approval","objective":"Validar capacidade com base documental","entry_criteria":["Pré-qualificação concluída"],"exit_criteria":["Pré-aprovação emitida","Documentação principal validada"],"required_fields":["preapproval_status","document_check_status","income_proof_received","asset_proof_received","identity_docs_received"],"default_tasks":["Solicitar documentos","Validar documentação","Atualizar prontidão do processo"],"blocked_if":["Documentos principais em falta"],"next_stage_code":"property_search","stage_code":"preapproval"}'::jsonb),

    -- Phase: Application
    (v_pipeline_id, p_workspace_id, 'Find Home', 6, 60, '#8b5cf6', 30,
     'Acompanhar procura e seleção do imóvel',
     '{"phase":"Application","objective":"Acompanhar procura e seleção do imóvel","entry_criteria":["Pré-aprovação emitida"],"exit_criteria":["Imóvel selecionado"],"required_fields":["property_search_status","target_location","target_property_value"],"default_tasks":["Acompanhar procura do imóvel","Rever enquadramento do imóvel escolhido"],"blocked_if":["Pré-aprovação expirada"],"next_stage_code":"application_submitted","stage_code":"property_search"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Application Submitted', 7, 70, '#a78bfa', 5,
     'Submeter candidatura formal',
     '{"phase":"Application","objective":"Submeter candidatura formal","entry_criteria":["Imóvel escolhido"],"exit_criteria":["Candidatura submetida"],"required_fields":["selected_property_address","selected_property_value","application_submission_date","loan_estimate_received"],"default_tasks":["Submeter candidatura","Confirmar receção","Registar Loan Estimate"],"blocked_if":["Sem imóvel definido"],"next_stage_code":"processing","stage_code":"application_submitted"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Processing', 8, 78, '#c4b5fd', 10,
     'Validar processo documental e emprego',
     '{"phase":"Application","objective":"Validar processo documental e emprego","entry_criteria":["Candidatura submetida"],"exit_criteria":["Processo documental completo"],"required_fields":["employment_verified","financial_documents_verified","processing_status"],"default_tasks":["Conferir documentos","Validar emprego","Sinalizar pendências"],"blocked_if":["Validação documental incompleta"],"next_stage_code":"appraisal","stage_code":"processing"}'::jsonb),

    -- Phase: Closing
    (v_pipeline_id, p_workspace_id, 'Appraisal', 9, 85, '#22c55e', 7,
     'Concluir avaliação independente do imóvel',
     '{"phase":"Closing","objective":"Concluir avaliação independente do imóvel","entry_criteria":["Processamento em curso"],"exit_criteria":["Avaliação concluída"],"required_fields":["appraisal_status","appraisal_value","appraisal_date"],"default_tasks":["Agendar avaliação","Registar resultado"],"blocked_if":["Avaliação pendente"],"next_stage_code":"insurance_closing_prep","stage_code":"appraisal"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Insurance & Closing Prep', 10, 92, '#4ade80', 5,
     'Preparar seguro e escritura',
     '{"phase":"Closing","objective":"Preparar seguro e escritura","entry_criteria":["Avaliação concluída"],"exit_criteria":["Tudo pronto para escritura"],"required_fields":["home_insurance_status","title_company_status","closing_docs_status","deed_date"],"default_tasks":["Validar seguro","Confirmar entidade de closing","Preparar documentos finais"],"blocked_if":["Seguro por emitir","Documentos finais incompletos"],"next_stage_code":"deed_signed_won","stage_code":"insurance_closing_prep"}'::jsonb),

    (v_pipeline_id, p_workspace_id, 'Deed Signed / Won', 11, 100, '#86efac', 3,
     'Concluir escritura e fechar negócio',
     '{"phase":"Closing","objective":"Concluir escritura e fechar negócio","entry_criteria":["Closing agendado"],"exit_criteria":["Escritura concluída","Negócio marcado como ganho"],"required_fields":["deal_status","deed_signed_date","closing_costs_paid","keys_delivered"],"default_tasks":["Marcar negócio como Won","Pedir testemunho","Ativar fluxo de referral"],"blocked_if":[],"next_stage_code":null,"stage_code":"deed_signed_won"}'::jsonb);

  -- Create benchmarks for each stage
  INSERT INTO pipeline_stage_benchmarks (pipeline_id, stage_id, workspace_id, expected_days, warning_multiplier, risk_multiplier)
  SELECT v_pipeline_id, ps.id, p_workspace_id, ps.expected_days, 1.5, 2.5
  FROM pipeline_stages ps
  WHERE ps.pipeline_id = v_pipeline_id;

END;
$$;

-- 4. Execute for all existing workspaces
DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    PERFORM create_mortgage_pipeline_for_workspace(ws.id);
  END LOOP;
END;
$$;
