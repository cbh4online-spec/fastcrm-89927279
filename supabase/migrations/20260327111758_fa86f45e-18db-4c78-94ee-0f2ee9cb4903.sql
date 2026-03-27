
-- Create a function to seed system templates for a workspace
CREATE OR REPLACE FUNCTION public.seed_communication_templates_for_workspace(p_workspace_id uuid, p_created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if workspace has no communication_templates yet
  IF EXISTS (SELECT 1 FROM communication_templates WHERE workspace_id = p_workspace_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO communication_templates (workspace_id, name, channel, language, journey_contexts, subject, body, tone, is_active, is_dynamic, personalization_level, created_by) VALUES
  -- 1. Captação Lead Frio
  (p_workspace_id, 'Captação Lead Frio', 'email', 'pt', ARRAY['followup'], 
   'Está a perder tempo com tarefas que poderiam ser automáticas?',
   E'Hoje, a maioria dos empresários ainda perde horas por semana em tarefas repetitivas.\n\nImagine se pudesse automatizar processos, organizar contactos e responder clientes com apoio de IA — sem depender de agências.\n\nNo Método PARE, ajudamos empresários a recuperar tempo e aumentar resultados com sistemas digitais simples e estratégicos.\n\nResponda a este email com "QUERO EVOLUIR" e enviamos-lhe o próximo passo.',
   'professional', true, false, 'basic', p_created_by),

  -- 2. WhatsApp Qualificação
  (p_workspace_id, 'WhatsApp Qualificação', 'whatsapp', 'pt', ARRAY['followup'],
   NULL,
   E'Olá! Estamos a ajudar empresários a digitalizar processos com IA.\n\nMuitos já reduziram custos operacionais e aumentaram eficiência.\n\nGostaria de saber como pode aplicar isto no seu negócio?\n\nPosso fazer-lhe 2 perguntas rápidas?',
   'human', true, false, 'basic', p_created_by),

  -- 3. Follow-Up Comercial
  (p_workspace_id, 'Follow-Up Comercial', 'email', 'pt', ARRAY['followup'],
   'Retomar a nossa conversa sobre digitalização',
   E'Queria retomar a nossa conversa sobre digitalização do seu negócio.\n\nIdentificámos oportunidades claras de automatização que podem reduzir custos fixos mensais.\n\nCom o Método PARE, implementamos um sistema adaptado à sua realidade.\n\nTem disponibilidade esta semana para uma conversa estratégica de 20 minutos?',
   'professional', true, false, 'basic', p_created_by),

  -- 4. Qualificação Inteligente (dynamic)
  (p_workspace_id, 'Qualificação Inteligente', 'email', 'pt', ARRAY['upsell', 'followup'],
   '{{#if conversion_probability > 70}}Vamos avançar com a transformação digital da {{company_name}}?{{else}}Exploramos oportunidades digitais na {{company_name}}?{{/if}}',
   E'Olá {{first_name}},\n\n{{#if business_maturity == "early"}}Sei que nesta fase é essencial organizar processos antes de escalar.{{/if}}\n\n{{#if business_maturity == "growth"}}Nesta fase de crescimento, automatizar é decisivo.{{/if}}\n\n{{#if business_maturity == "scale"}}Empresas na sua fase precisam de sistemas integrados com IA.{{/if}}\n\nNo Método PARE ajudamos empresários a:\n• Reduzir dependência de terceiros\n• Automatizar processos\n• Aumentar eficiência operacional\n\n{{#if recommended_tone == "direct"}}Podemos agendar uma conversa estratégica esta semana?{{else}}Gostaria de perceber se faz sentido explorar isto consigo.{{/if}}',
   'professional', true, true, 'advanced', p_created_by),

  -- 5. Reativação Inteligente (dynamic)
  (p_workspace_id, 'Reativação Inteligente', 'email', 'pt', ARRAY['reativacao'],
   'Novidades que podem interessar à {{company_name}}',
   E'Olá {{first_name}},\n\n{{#if days_since_last_contact > 30}}Passaram algumas semanas desde o nosso último contacto.{{/if}}\n\nEntretanto evoluímos o sistema com novas funcionalidades de IA.\n\n{{#if industry == "Clínica"}}Muitas clínicas estão a reduzir custos administrativos com automação.{{/if}}\n\n{{#if industry == "Formação"}}Empresas de formação estão a automatizar jornadas de alunos.{{/if}}\n\n{{#if urgency_level == "high"}}Acredito que este pode ser um momento estratégico para agir.{{else}}Se fizer sentido, posso enviar mais detalhes.{{/if}}',
   'human', true, true, 'advanced', p_created_by),

  -- 6. Proposta Quente (dynamic)
  (p_workspace_id, 'Proposta Quente', 'email', 'pt', ARRAY['upsell', 'conclusao'],
   'Proposta personalizada para {{company_name}}',
   E'Olá {{first_name}},\n\nCom base na nossa conversa e no potencial estimado de {{potential_value}}€,\n\nIdentificámos oportunidades claras para:\n• Automatizar {{industry}}\n• Integrar IA no processo comercial\n• Reduzir custo operacional\n\n{{#if conversion_probability > 80}}Podemos formalizar já esta semana?{{else}}Podemos alinhar os próximos passos?{{/if}}',
   'commercial', true, true, 'advanced', p_created_by),

  -- 7. Convite Masterclasse
  (p_workspace_id, 'Convite Masterclasse', 'email', 'pt', ARRAY['followup'],
   'Está a preparar o seu negócio para a nova era da IA?',
   E'Está a preparar o seu negócio para a nova era da IA?\n\nNa próxima masterclasse vamos mostrar como qualquer empresário pode criar um sistema digital autónomo.\n\nSem depender de agências. Sem complexidade técnica.\n\nReserve o seu lugar aqui: [link]',
   'commercial', true, false, 'basic', p_created_by),

  -- 8. Recuperação Lead Inativo
  (p_workspace_id, 'Recuperação Lead Inativo', 'email', 'pt', ARRAY['reativacao'],
   'Temos novidades que podem interessar-lhe',
   E'Há algum tempo falou connosco sobre transformar digitalmente o seu negócio.\n\nEntretanto, evoluímos o sistema e temos novas funcionalidades com IA integrada.\n\nPode ser o momento ideal para retomar esta conversa.\n\nPosso enviar-lhe um resumo das novidades?',
   'empathetic', true, false, 'basic', p_created_by);
END;
$$;

-- Seed templates for all workspaces that don't have any yet
DO $$
DECLARE
  ws RECORD;
  fallback_user uuid;
BEGIN
  -- Get any user as fallback created_by
  SELECT id INTO fallback_user FROM auth.users LIMIT 1;
  
  FOR ws IN SELECT id FROM workspaces LOOP
    PERFORM seed_communication_templates_for_workspace(ws.id, fallback_user);
  END LOOP;
END;
$$;
