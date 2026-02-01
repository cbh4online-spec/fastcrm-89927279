import { ShoppingBag, Users, HelpCircle, Sparkles } from 'lucide-react';
import { FlowStepType, VariableType } from '@/types/conversational-flows';

export interface FlowTemplateVariable {
  name: string;
  displayName: string;
  variableType: VariableType;
  isRequired: boolean;
  mapToField?: string;
  validationPattern?: string;
  validationMessage?: string;
  choices?: string[];
}

export interface FlowTemplateStep {
  id: string;
  stepType: FlowStepType;
  name: string;
  messageContent?: string;
  quickReplies?: string[];
  variableToCollect?: string; // Nome da variável a recolher
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  goalName?: string;
  conversionValue?: number;
  actionType?: string;
  actionConfig?: Record<string, unknown>;
  connectsTo?: string; // ID do passo seguinte
  conditionTrueConnectsTo?: string;
  conditionFalseConnectsTo?: string;
  isEntryPoint?: boolean;
  positionX: number;
  positionY: number;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultGoalType: string;
  defaultChannels: string[];
  variables: FlowTemplateVariable[];
  steps: FlowTemplateStep[];
}

// Template: Funil Universal Pharliss
export const PHARLISS_UNIVERSAL_TEMPLATE: FlowTemplate = {
  id: 'pharliss-universal-funnel',
  name: 'Funil Universal - Produtos e Equipamentos',
  description: 'Fluxo de vendas para recolha de informação e recomendação de produtos Pharliss',
  category: 'Vendas',
  icon: ShoppingBag,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [
    {
      name: 'nome',
      displayName: 'Nome',
      variableType: 'text',
      isRequired: true,
      mapToField: 'lead.name'
    },
    {
      name: 'contacto',
      displayName: 'Contacto',
      variableType: 'phone',
      isRequired: true,
      mapToField: 'lead.phone'
    },
    {
      name: 'email',
      displayName: 'Email',
      variableType: 'email',
      isRequired: true,
      mapToField: 'lead.email'
    },
    {
      name: 'objetivo',
      displayName: 'Objetivo Principal',
      variableType: 'choice',
      isRequired: true,
      mapToField: 'lead.specialty',
      choices: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo']
    },
    {
      name: 'estado_atual',
      displayName: 'Estado Atual',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'tempo_problema',
      displayName: 'Tempo do Problema',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'intensidade',
      displayName: 'Intensidade (1-10)',
      variableType: 'number',
      isRequired: true
    },
    {
      name: 'tem_profissional',
      displayName: 'Tem Profissional Próximo',
      variableType: 'boolean',
      isRequired: false
    }
  ],

  steps: [
    // 1. Saudação
    {
      id: 'step-1-saudacao',
      stepType: 'message',
      name: 'Saudação',
      messageContent: 'Olá! 👋 Que bom receber o seu contacto. Sou o assistente especializado da Pharliss e estou aqui para ajudar a encontrar a melhor opção dentro da nossa linha profissional.',
      isEntryPoint: true,
      connectsTo: 'step-2-nome',
      positionX: 100,
      positionY: 100
    },
    // 2. Recolha Nome
    {
      id: 'step-2-nome',
      stepType: 'question',
      name: 'Recolha Nome',
      messageContent: 'Para que eu possa enviar recomendações personalizadas e instruções completas, poderia indicar o seu nome?',
      variableToCollect: 'nome',
      connectsTo: 'step-3-contacto',
      positionX: 100,
      positionY: 220
    },
    // 3. Recolha Contacto
    {
      id: 'step-3-contacto',
      stepType: 'question',
      name: 'Recolha Contacto',
      messageContent: 'Qual o seu número de contacto?',
      variableToCollect: 'contacto',
      connectsTo: 'step-4-email',
      positionX: 100,
      positionY: 340
    },
    // 4. Recolha Email
    {
      id: 'step-4-email',
      stepType: 'question',
      name: 'Recolha Email',
      messageContent: 'E o seu email para enviarmos ofertas exclusivas?',
      variableToCollect: 'email',
      connectsTo: 'step-5-agradecimento',
      positionX: 100,
      positionY: 460
    },
    // 5. Agradecimento
    {
      id: 'step-5-agradecimento',
      stepType: 'message',
      name: 'Agradecimento',
      messageContent: 'Obrigado, {nome}! 🙏',
      connectsTo: 'step-6-objetivo',
      positionX: 100,
      positionY: 580
    },
    // 6. Objetivo Principal
    {
      id: 'step-6-objetivo',
      stepType: 'question',
      name: 'Objetivo Principal',
      messageContent: 'Para entender exatamente o que procura, poderia dizer qual é o seu objetivo principal?',
      variableToCollect: 'objetivo',
      quickReplies: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo'],
      connectsTo: 'step-7-estado',
      positionX: 100,
      positionY: 700
    },
    // 7. Estado Atual
    {
      id: 'step-7-estado',
      stepType: 'question',
      name: 'Estado Atual',
      messageContent: 'Como está hoje o seu {objetivo}?',
      variableToCollect: 'estado_atual',
      connectsTo: 'step-8-tempo',
      positionX: 100,
      positionY: 820
    },
    // 8. Tempo do Problema
    {
      id: 'step-8-tempo',
      stepType: 'question',
      name: 'Tempo do Problema',
      messageContent: 'Isto acontece há quanto tempo?',
      variableToCollect: 'tempo_problema',
      connectsTo: 'step-9-intensidade',
      positionX: 100,
      positionY: 940
    },
    // 9. Intensidade
    {
      id: 'step-9-intensidade',
      stepType: 'question',
      name: 'Intensidade',
      messageContent: 'Num nível de 1 a 10, como classificaria a intensidade da situação?',
      variableToCollect: 'intensidade',
      connectsTo: 'step-10-analise',
      positionX: 100,
      positionY: 1060
    },
    // 10. Análise e Recomendação
    {
      id: 'step-10-analise',
      stepType: 'message',
      name: 'Análise e Recomendação',
      messageContent: 'Perfeito, obrigado por partilhar! 💡 Com base no que descreveu, posso recomendar uma solução profissional adequada à sua situação.\n\nEsta solução foi pensada para:\n• Melhorar gradualmente o problema\n• Atuar na causa e não só no efeito\n• Ser segura e de qualidade profissional\n• Ter resultados consistentes quando usada corretamente',
      connectsTo: 'step-11-profissional',
      positionX: 100,
      positionY: 1180
    },
    // 11. Pergunta Profissional
    {
      id: 'step-11-profissional',
      stepType: 'question',
      name: 'Tem Profissional',
      messageContent: 'Tem um profissional de beleza/saúde próximo da sua área de residência que possa indicar?',
      variableToCollect: 'tem_profissional',
      quickReplies: ['Sim', 'Não'],
      connectsTo: 'step-12-condicao',
      positionX: 100,
      positionY: 1300
    },
    // 12. Condição
    {
      id: 'step-12-condicao',
      stepType: 'condition',
      name: 'Verifica Profissional',
      conditionField: 'tem_profissional',
      conditionOperator: 'equals',
      conditionValue: 'Sim',
      conditionTrueConnectsTo: 'step-13-remete-prof',
      conditionFalseConnectsTo: 'step-14-handoff',
      positionX: 100,
      positionY: 1420
    },
    // 13. Remete ao Profissional
    {
      id: 'step-13-remete-prof',
      stepType: 'message',
      name: 'Remete ao Profissional',
      messageContent: 'Excelente! Recomendo que visite o profissional para uma avaliação personalizada. Ele poderá indicar o produto ideal da nossa linha para o seu caso específico.\n\nPosso ajudar com mais alguma coisa?',
      connectsTo: 'step-15-goal',
      positionX: 300,
      positionY: 1540
    },
    // 14. Handoff Humano
    {
      id: 'step-14-handoff',
      stepType: 'handoff',
      name: 'Transferir para Especialista',
      messageContent: 'Como não tem um profissional próximo, vou transferir esta conversa para um especialista da nossa equipa que poderá ajudá-lo(a) diretamente com recomendações e opções de entrega.\n\nUm momento, por favor...',
      actionType: 'transfer_to_human',
      actionConfig: { reason: 'Sem profissional próximo - precisa de apoio direto' },
      positionX: -100,
      positionY: 1540
    },
    // 15. Goal - Lead Qualificado
    {
      id: 'step-15-goal',
      stepType: 'goal',
      name: 'Lead Qualificado',
      goalName: 'Lead Qualificado com Sucesso',
      conversionValue: 1,
      positionX: 300,
      positionY: 1660
    }
  ]
};
// Template: Funil Dr. Kraut - Estética Corporal e Facial
export const DR_KRAUT_TEMPLATE: FlowTemplate = {
  id: 'dr-kraut-estetica',
  name: 'Dr. Kraut - Estética Corporal e Facial',
  description: 'Fluxo de vendas para protocolos de estética corporal e facial Dr. Kraut',
  category: 'Vendas',
  icon: Sparkles,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [
    {
      name: 'nome',
      displayName: 'Nome',
      variableType: 'text',
      isRequired: true,
      mapToField: 'lead.name'
    },
    {
      name: 'objetivo_tratamento',
      displayName: 'Objetivo do Tratamento',
      variableType: 'choice',
      isRequired: true,
      mapToField: 'lead.specialty',
      choices: ['Redução de volume', 'Firmeza', 'Drenagem', 'Celulite', 'Relaxamento', 'Rejuvenescimento facial', 'Hidratação avançada']
    },
    {
      name: 'zona_foco',
      displayName: 'Zona de Foco',
      variableType: 'choice',
      isRequired: true,
      choices: ['Rosto', 'Pernas', 'Abdómen', 'Glúteos', 'Corpo inteiro']
    },
    {
      name: 'tempo_necessidade',
      displayName: 'Tempo da Necessidade',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'intensidade',
      displayName: 'Intensidade (1-10)',
      variableType: 'number',
      isRequired: true
    },
    {
      name: 'interesse_compra',
      displayName: 'Interesse em Comprar',
      variableType: 'boolean',
      isRequired: false
    }
  ],

  steps: [
    // 1. Saudação Dr. Kraut
    {
      id: 'drk-step-1-saudacao',
      stepType: 'message',
      name: 'Saudação Dr. Kraut',
      messageContent: 'Olá! Que bom receber o seu contacto. A Dr. Kraut é uma linha profissional de estética corporal e facial com fórmulas de alta performance e protocolos desenvolvidos para resultados visíveis e consistentes. Como posso ajudar hoje na sua rotina ou tratamento estético?',
      isEntryPoint: true,
      connectsTo: 'drk-step-2-nome',
      positionX: 100,
      positionY: 100
    },
    // 2. Recolha Nome
    {
      id: 'drk-step-2-nome',
      stepType: 'question',
      name: 'Recolha Nome',
      messageContent: 'Para preparar um atendimento completo e direcionado para si, poderia indicar o seu nome?',
      variableToCollect: 'nome',
      connectsTo: 'drk-step-3-agradecimento',
      positionX: 100,
      positionY: 220
    },
    // 3. Agradecimento
    {
      id: 'drk-step-3-agradecimento',
      stepType: 'message',
      name: 'Agradecimento',
      messageContent: 'Obrigado, {nome}! 🙏',
      connectsTo: 'drk-step-4-objetivo',
      positionX: 100,
      positionY: 340
    },
    // 4. Objetivo de Tratamento
    {
      id: 'drk-step-4-objetivo',
      stepType: 'question',
      name: 'Objetivo Tratamento',
      messageContent: 'Para eu poder recomendar o melhor protocolo, diga-me qual é o seu objetivo principal neste momento?',
      variableToCollect: 'objetivo_tratamento',
      quickReplies: ['Redução de volume', 'Firmeza', 'Drenagem', 'Celulite', 'Relaxamento', 'Rejuvenescimento facial', 'Hidratação avançada'],
      connectsTo: 'drk-step-5-zona',
      positionX: 100,
      positionY: 460
    },
    // 5. Zona de Foco
    {
      id: 'drk-step-5-zona',
      stepType: 'question',
      name: 'Zona de Foco',
      messageContent: 'Em que zona pretende trabalhar?',
      variableToCollect: 'zona_foco',
      quickReplies: ['Rosto', 'Pernas', 'Abdómen', 'Glúteos', 'Corpo inteiro'],
      connectsTo: 'drk-step-6-tempo',
      positionX: 100,
      positionY: 580
    },
    // 6. Tempo da Necessidade
    {
      id: 'drk-step-6-tempo',
      stepType: 'question',
      name: 'Tempo Necessidade',
      messageContent: 'Há quanto tempo sente essa necessidade?',
      variableToCollect: 'tempo_necessidade',
      connectsTo: 'drk-step-7-intensidade',
      positionX: 100,
      positionY: 700
    },
    // 7. Intensidade
    {
      id: 'drk-step-7-intensidade',
      stepType: 'question',
      name: 'Intensidade',
      messageContent: 'Numa escala de 1 a 10, qual é a intensidade do problema ou urgência em resolver?',
      variableToCollect: 'intensidade',
      connectsTo: 'drk-step-8-analise',
      positionX: 100,
      positionY: 820
    },
    // 8. Análise e Apresentação do Protocolo
    {
      id: 'drk-step-8-analise',
      stepType: 'message',
      name: 'Análise Protocolo',
      messageContent: 'Perfeito, {nome}! ✨ Com base no que descreveu, posso recomendar um protocolo profissional Dr. Kraut adequado para {objetivo_tratamento} na zona de {zona_foco}.\n\nOs nossos protocolos são desenvolvidos para resultados visíveis e consistentes.',
      connectsTo: 'drk-step-9-interesse',
      positionX: 100,
      positionY: 940
    },
    // 9. Interesse em Avançar
    {
      id: 'drk-step-9-interesse',
      stepType: 'question',
      name: 'Interesse Compra',
      messageContent: 'Gostaria que lhe enviasse informações sobre preços e como avançar com o protocolo recomendado?',
      variableToCollect: 'interesse_compra',
      quickReplies: ['Sim, quero saber mais', 'Ainda não'],
      connectsTo: 'drk-step-10-condicao',
      positionX: 100,
      positionY: 1060
    },
    // 10. Condição - Verifica Interesse
    {
      id: 'drk-step-10-condicao',
      stepType: 'condition',
      name: 'Verifica Interesse',
      conditionField: 'interesse_compra',
      conditionOperator: 'equals',
      conditionValue: 'Sim, quero saber mais',
      conditionTrueConnectsTo: 'drk-step-11-handoff',
      conditionFalseConnectsTo: 'drk-step-12-followup',
      positionX: 100,
      positionY: 1180
    },
    // 11. Handoff para Vendas
    {
      id: 'drk-step-11-handoff',
      stepType: 'handoff',
      name: 'Transferir Vendas',
      messageContent: 'Vou transferir esta conversa para um especialista da nossa equipa que irá enviar-lhe o link seguro de pagamento e todas as informações do protocolo recomendado.\n\nUm momento, por favor... 🛒',
      actionType: 'transfer_to_human',
      actionConfig: { reason: 'Lead qualificado interessado em compra Dr. Kraut' },
      connectsTo: 'drk-step-13-goal-venda',
      positionX: 300,
      positionY: 1300
    },
    // 12. Follow-up Agendado
    {
      id: 'drk-step-12-followup',
      stepType: 'message',
      name: 'Follow-up Agendado',
      messageContent: 'Sem problema, {nome}! 😊 Fico aqui disponível quando quiser retomar.\n\nContinuarei aqui para ajudar a escolher o melhor protocolo Dr. Kraut para si. Quando quiser avançar, basta enviar mensagem.',
      connectsTo: 'drk-step-14-goal-nurturing',
      positionX: -100,
      positionY: 1300
    },
    // 13. Goal - Venda Iniciada
    {
      id: 'drk-step-13-goal-venda',
      stepType: 'goal',
      name: 'Venda Iniciada',
      goalName: 'Lead Qualificado para Venda Dr. Kraut',
      conversionValue: 1,
      positionX: 300,
      positionY: 1420
    },
    // 14. Goal - Lead Nurturing
    {
      id: 'drk-step-14-goal-nurturing',
      stepType: 'goal',
      name: 'Lead Nurturing',
      goalName: 'Lead para Follow-up Dr. Kraut',
      conversionValue: 0.5,
      positionX: -100,
      positionY: 1420
    }
  ]
};

// Template: Atendimento Cliente Profissional B2B
export const ATENDIMENTO_PROFISSIONAL_TEMPLATE: FlowTemplate = {
  id: 'atendimento-profissional',
  name: 'Atendimento Cliente Profissional',
  description: 'Fluxo de qualificação e atendimento para clientes profissionais B2B com recolha completa de dados',
  category: 'Vendas',
  icon: Users,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [
    {
      name: 'nome',
      displayName: 'Nome',
      variableType: 'text',
      isRequired: true,
      mapToField: 'lead.name'
    },
    {
      name: 'telefone',
      displayName: 'Telefone',
      variableType: 'phone',
      isRequired: true,
      mapToField: 'lead.phone'
    },
    {
      name: 'email',
      displayName: 'Email',
      variableType: 'email',
      isRequired: true,
      mapToField: 'lead.email'
    },
    {
      name: 'e_profissional',
      displayName: 'É Profissional',
      variableType: 'boolean',
      isRequired: true
    },
    {
      name: 'objetivo_principal',
      displayName: 'Objetivo Principal',
      variableType: 'choice',
      isRequired: true,
      mapToField: 'lead.specialty',
      choices: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo', 'Formação profissional', 'Equipamentos']
    },
    {
      name: 'situacao_atual',
      displayName: 'Situação Atual',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'zona_pais',
      displayName: 'Zona do País',
      variableType: 'text',
      isRequired: true,
      mapToField: 'lead.city'
    },
    {
      name: 'codigo_postal',
      displayName: 'Código Postal',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'formacao_atual',
      displayName: 'Formação Atual',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'experiencia_profissional',
      displayName: 'Experiência Profissional',
      variableType: 'text',
      isRequired: true
    }
  ],

  steps: [
    // 1. Saudação Premium
    {
      id: 'prof-step-1-saudacao',
      stepType: 'message',
      name: 'Saudação Premium',
      messageContent: 'Olá! Que alegria imensa receber o seu contacto. O meu nome é Ana da ENsI Pharliss, e estou aqui para acompanhar cada passo consigo, seja na sua formação, evolução profissional ou no cuidado capilar mais avançado. Como posso ajudar hoje?',
      isEntryPoint: true,
      connectsTo: 'prof-step-2-nome',
      positionX: 100,
      positionY: 100
    },
    // 2. Recolha Nome
    {
      id: 'prof-step-2-nome',
      stepType: 'question',
      name: 'Recolha Nome',
      messageContent: 'Para preparar um atendimento completo, poderia indicar o seu nome?',
      variableToCollect: 'nome',
      connectsTo: 'prof-step-3-telefone',
      positionX: 100,
      positionY: 220
    },
    // 3. Recolha Telefone
    {
      id: 'prof-step-3-telefone',
      stepType: 'question',
      name: 'Recolha Telefone',
      messageContent: 'Qual o seu número de telefone para contacto?',
      variableToCollect: 'telefone',
      connectsTo: 'prof-step-4-email',
      positionX: 100,
      positionY: 340
    },
    // 4. Recolha Email
    {
      id: 'prof-step-4-email',
      stepType: 'question',
      name: 'Recolha Email',
      messageContent: 'E o seu email profissional?',
      variableToCollect: 'email',
      connectsTo: 'prof-step-5-agradecimento',
      positionX: 100,
      positionY: 460
    },
    // 5. Agradecimento
    {
      id: 'prof-step-5-agradecimento',
      stepType: 'message',
      name: 'Agradecimento',
      messageContent: 'Obrigada, {nome}! 🙏',
      connectsTo: 'prof-step-6-verifica-prof',
      positionX: 100,
      positionY: 580
    },
    // 6. Verifica Profissional
    {
      id: 'prof-step-6-verifica-prof',
      stepType: 'question',
      name: 'Verifica Profissional',
      messageContent: 'Para direcionar melhor o atendimento, confirma que é profissional da área de beleza/saúde?',
      variableToCollect: 'e_profissional',
      quickReplies: ['Sim, sou profissional', 'Não'],
      connectsTo: 'prof-step-7-condicao',
      positionX: 100,
      positionY: 700
    },
    // 7. Condição Profissional
    {
      id: 'prof-step-7-condicao',
      stepType: 'condition',
      name: 'Condição Profissional',
      conditionField: 'e_profissional',
      conditionOperator: 'equals',
      conditionValue: 'Sim, sou profissional',
      conditionTrueConnectsTo: 'prof-step-8-objetivo',
      conditionFalseConnectsTo: 'prof-step-15-nao-prof',
      positionX: 100,
      positionY: 820
    },
    // 8. Objetivo Principal
    {
      id: 'prof-step-8-objetivo',
      stepType: 'question',
      name: 'Objetivo Principal',
      messageContent: 'Qual é o seu objetivo principal neste momento?',
      variableToCollect: 'objetivo_principal',
      quickReplies: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo', 'Formação profissional', 'Equipamentos'],
      connectsTo: 'prof-step-9-situacao',
      positionX: 300,
      positionY: 940
    },
    // 9. Situação Atual
    {
      id: 'prof-step-9-situacao',
      stepType: 'question',
      name: 'Situação Atual',
      messageContent: 'Como está atualmente a situação que pretende resolver?',
      variableToCollect: 'situacao_atual',
      connectsTo: 'prof-step-10-zona',
      positionX: 300,
      positionY: 1060
    },
    // 10. Zona do País
    {
      id: 'prof-step-10-zona',
      stepType: 'question',
      name: 'Zona do País',
      messageContent: 'Em que zona do país se encontra? (localidade e código postal)',
      variableToCollect: 'zona_pais',
      connectsTo: 'prof-step-11-formacao',
      positionX: 300,
      positionY: 1180
    },
    // 11. Formação Atual
    {
      id: 'prof-step-11-formacao',
      stepType: 'question',
      name: 'Formação Atual',
      messageContent: 'Qual é a sua formação atual na área?',
      variableToCollect: 'formacao_atual',
      connectsTo: 'prof-step-12-experiencia',
      positionX: 300,
      positionY: 1300
    },
    // 12. Experiência Profissional
    {
      id: 'prof-step-12-experiencia',
      stepType: 'question',
      name: 'Experiência Profissional',
      messageContent: 'Quantos anos de experiência profissional tem?',
      variableToCollect: 'experiencia_profissional',
      connectsTo: 'prof-step-13-analise',
      positionX: 300,
      positionY: 1420
    },
    // 13. Análise Parceiros
    {
      id: 'prof-step-13-analise',
      stepType: 'message',
      name: 'Análise Parceiros',
      messageContent: 'Perfeito, {nome}! ✨ Estou a verificar se existem parceiros Pharliss na sua zona de {zona_pais}.\n\nCom base no seu perfil profissional e objetivos, vou preparar uma recomendação personalizada.',
      connectsTo: 'prof-step-14-handoff',
      positionX: 300,
      positionY: 1540
    },
    // 14. Handoff Coordenadora
    {
      id: 'prof-step-14-handoff',
      stepType: 'handoff',
      name: 'Handoff Coordenadora',
      messageContent: 'Vou passar o seu processo para a nossa coordenadora responsável que irá analisar o seu perfil e entrar em contacto nas próximas duas horas. 📋',
      actionType: 'transfer_to_human',
      actionConfig: { department: 'coordenacao', priority: 'high', reason: 'Lead profissional B2B qualificado' },
      connectsTo: 'prof-step-16-goal',
      positionX: 300,
      positionY: 1660
    },
    // 15. Lead Não Profissional
    {
      id: 'prof-step-15-nao-prof',
      stepType: 'message',
      name: 'Lead Não Profissional',
      messageContent: 'Os nossos produtos são de uso profissional. Para garantir os melhores resultados, recomendamos que contacte um profissional certificado na sua área.\n\nPosso ajudar a encontrar um parceiro próximo de si? 🔍',
      positionX: -100,
      positionY: 940
    },
    // 16. Goal - Lead B2B Qualificado
    {
      id: 'prof-step-16-goal',
      stepType: 'goal',
      name: 'Lead B2B Qualificado',
      goalName: 'Lead Profissional Qualificado Pharliss',
      conversionValue: 1,
      positionX: 300,
      positionY: 1780
    }
  ]
};

// Lista de todos os templates disponíveis
export const FLOW_TEMPLATES: FlowTemplate[] = [
  PHARLISS_UNIVERSAL_TEMPLATE,
  DR_KRAUT_TEMPLATE,
  ATENDIMENTO_PROFISSIONAL_TEMPLATE
];
// Componente para mostrar card de template
interface TemplateCardProps {
  template: FlowTemplate;
  onSelect: (template: FlowTemplate) => void;
  isSelected?: boolean;
}

export function TemplateCard({ template, onSelect, isSelected }: TemplateCardProps) {
  const Icon = template.icon;
  
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {template.steps.length} passos
            </span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {template.variables.length} variáveis
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
