/**
 * Seeds da biblioteca inicial de templates comerciais WhatsApp.
 * Módulo puro — não escreve na base de dados por si só.
 */
import type { ExecutionMode, TemplateFamily } from "./families.ts";

export interface PlaybookTemplateSeed {
  code: string;
  name: string;
  family: TemplateFamily;
  subfamily: string;
  pipelineStage: string;
  objective: string;
  description: string;
  messageBody: string;
  /** Janela recomendada em minutos desde o evento de referência. */
  timingMinMinutes: number | null;
  timingMaxMinutes: number | null;
  useConditions: Record<string, unknown>;
  exclusionConditions: Record<string, unknown>;
  requiredVariables: string[];
  variableFallbacks: Record<string, string>;
  cta: string;
  behavioralPrinciple: string;
  primaryKpi: string;
  priority: number;
  executionMode: ExecutionMode;
}

const NO_CONTACT_EXCLUSIONS = {
  stop_contact: false,
  opted_out: false,
  has_replied: false,
};

export const LEAD_NEW_SEEDS: PlaybookTemplateSeed[] = [
  {
    code: "LEAD_NEW_01",
    name: "Resposta imediata",
    family: "lead_new",
    subfamily: "primeira_tentativa",
    pipelineStage: "novo",
    objective: "Obter a primeira resposta",
    description: "Nova lead proveniente de formulário, funil ou campanha.",
    messageBody:
      "Olá {{primeiro_nome}}, sou {{comercial}} da {{empresa}}.\n\n" +
      "Vi agora o seu pedido sobre {{produto_interesse}}.\n\n" +
      "Para perceber exatamente o que procura e não lhe enviar informação genérica, diga-me só uma coisa: {{pergunta_qualificacao_binaria}}",
    timingMinMinutes: 0,
    timingMaxMinutes: 2,
    useConditions: { messages_sent: 0, source: "inbound" },
    exclusionConditions: NO_CONTACT_EXCLUSIONS,
    requiredVariables: ["primeiro_nome", "comercial", "empresa", "produto_interesse", "pergunta_qualificacao_binaria"],
    variableFallbacks: { produto_interesse: "o que nos pediu", primeiro_nome: "" },
    cta: "Responder à pergunta binária",
    behavioralPrinciple: "Relevância + personalização + microcompromisso + redução da carga cognitiva",
    primaryKpi: "Taxa de primeira resposta",
    priority: 95,
    executionMode: "assisted",
  },
  {
    code: "LEAD_NEW_02",
    name: "Recuperar a conversa",
    family: "lead_new",
    subfamily: "segunda_tentativa",
    pipelineStage: "novo",
    objective: "Recuperar a conversa",
    description: "Enviada 15–30 minutos depois se não existir resposta.",
    messageBody:
      "{{primeiro_nome}}, fiquei com o seu pedido aqui comigo.\n\n" +
      "Antes de lhe recomendar a solução mais adequada, preciso apenas de perceber um ponto.\n\n" +
      "Posso fazer-lhe uma pergunta rápida?",
    timingMinMinutes: 15,
    timingMaxMinutes: 30,
    useConditions: { messages_sent: 1 },
    exclusionConditions: NO_CONTACT_EXCLUSIONS,
    requiredVariables: ["primeiro_nome"],
    variableFallbacks: { primeiro_nome: "" },
    cta: "Autorizar a pergunta",
    behavioralPrinciple: "Microcompromisso + autonomia",
    primaryKpi: "Taxa de resposta",
    priority: 85,
    executionMode: "assisted",
  },
  {
    code: "LEAD_NEW_03",
    name: "Escolha múltipla",
    family: "lead_new",
    subfamily: "sem_resposta",
    pipelineStage: "novo",
    objective: "Reduzir o esforço necessário para responder",
    description: "Cerca de 4 horas sem resposta.",
    messageBody:
      "{{primeiro_nome}}, quando pediu informação sobre {{produto_interesse}}, qual destas situações estava mais próxima do que pretende resolver?\n\n" +
      "{{opcao_1}}\n{{opcao_2}}\n{{opcao_3}}\n\nPode responder apenas com 1, 2 ou 3.",
    timingMinMinutes: 240,
    timingMaxMinutes: 480,
    useConditions: { messages_sent: 2 },
    exclusionConditions: NO_CONTACT_EXCLUSIONS,
    requiredVariables: ["primeiro_nome", "produto_interesse", "opcao_1", "opcao_2", "opcao_3"],
    variableFallbacks: { produto_interesse: "o que nos pediu" },
    cta: "Responder 1, 2 ou 3",
    behavioralPrinciple: "Redução da carga cognitiva",
    primaryKpi: "Taxa de resposta",
    priority: 75,
    executionMode: "assisted",
  },
  {
    code: "LEAD_NEW_04",
    name: "Confirmar canal preferido",
    family: "lead_new",
    subfamily: "recuperacao",
    pipelineStage: "novo",
    objective: "Reabrir o canal de conversa",
    description: "24 horas sem resposta.",
    messageBody:
      "Olá {{primeiro_nome}}, não quero estar a insistir se entretanto deixou de fazer sentido.\n\n" +
      "O seu pedido sobre {{produto_interesse}} ainda está em aberto comigo.\n\n" +
      "Prefere que lhe envie a informação por aqui ou que falemos rapidamente?",
    timingMinMinutes: 1440,
    timingMaxMinutes: 2160,
    useConditions: { messages_sent: 3 },
    exclusionConditions: NO_CONTACT_EXCLUSIONS,
    requiredVariables: ["primeiro_nome", "produto_interesse"],
    variableFallbacks: { produto_interesse: "o que nos pediu" },
    cta: "Escolher o canal",
    behavioralPrinciple: "Autonomia + ausência de pressão",
    primaryKpi: "Taxa de resposta",
    priority: 65,
    executionMode: "assisted",
  },
  {
    code: "LEAD_NEW_05",
    name: "Última tentativa",
    family: "lead_new",
    subfamily: "ultima_tentativa",
    pipelineStage: "novo",
    objective: "Encerrar o ciclo ou reabrir a conversa",
    description: "48–72 horas sem resposta. Depois desta mensagem a lead sai da sequência quente.",
    messageBody:
      "{{primeiro_nome}}, vou deixar de insistir relativamente ao seu pedido sobre {{produto_interesse}}.\n\n" +
      "Antes disso, só queria confirmar uma coisa: deixou de ser uma prioridade neste momento ou ainda gostaria de analisar a solução?",
    timingMinMinutes: 2880,
    timingMaxMinutes: 4320,
    useConditions: { messages_sent: 4 },
    exclusionConditions: NO_CONTACT_EXCLUSIONS,
    requiredVariables: ["primeiro_nome", "produto_interesse"],
    variableFallbacks: { produto_interesse: "o que nos pediu" },
    cta: "Confirmar prioridade",
    behavioralPrinciple: "Encerramento de ciclo",
    primaryKpi: "Taxa de resposta",
    priority: 55,
    executionMode: "assisted",
  },
  {
    code: "LEAD_NEW_06",
    name: "Adiamento do contacto",
    family: "lead_new",
    subfamily: "adiamento",
    pipelineStage: "novo",
    objective: "Agendar o momento certo para voltar a falar",
    description: 'Usar quando a lead indica "agora não".',
    messageBody:
      "Perfeito, {{primeiro_nome}}.\n\n" +
      "Para não estar a contactá-lo sem necessidade, quando faria mais sentido voltarmos a falar sobre {{produto_interesse}}?\n\n" +
      "Mais para o final deste mês ou prefere que fique para o próximo?",
    timingMinMinutes: 0,
    timingMaxMinutes: 60,
    useConditions: { intent: "postpone" },
    exclusionConditions: { stop_contact: false, opted_out: false },
    requiredVariables: ["primeiro_nome", "produto_interesse"],
    variableFallbacks: { produto_interesse: "o que nos pediu" },
    cta: "Indicar período",
    behavioralPrinciple: "Autonomia + antecipação",
    primaryKpi: "Follow-ups agendados",
    priority: 80,
    executionMode: "assisted",
  },
];

export const QUALIFY_SEEDS: PlaybookTemplateSeed[] = [
  {
    code: "QUALIFY_01",
    name: "Objetivo",
    family: "qualification",
    subfamily: "objetivo",
    pipelineStage: "qualificacao",
    objective: "Descobrir o objetivo do cliente",
    description: "Guardar a resposta como objetivo da lead.",
    messageBody:
      "Percebi.\n\nE no seu caso, {{primeiro_nome}}, qual seria o principal resultado que gostaria de conseguir com {{produto_interesse}}?",
    timingMinMinutes: 0,
    timingMaxMinutes: 60,
    useConditions: { has_replied: true, missing_field: "objetivo_cliente" },
    exclusionConditions: { stop_contact: false, opted_out: false },
    requiredVariables: ["primeiro_nome", "produto_interesse"],
    variableFallbacks: { produto_interesse: "o que nos pediu" },
    cta: "Descrever o objetivo",
    behavioralPrinciple: "Progressão gradual",
    primaryKpi: "Objetivo preenchido",
    priority: 90,
    executionMode: "assisted",
  },
  {
    code: "QUALIFY_02",
    name: "Problema",
    family: "qualification",
    subfamily: "problema",
    pipelineStage: "qualificacao",
    objective: "Identificar o problema principal",
    description: "Guardar como problema_principal.",
    messageBody: "E o que está neste momento a dificultar chegar a esse resultado?",
    timingMinMinutes: 0,
    timingMaxMinutes: 120,
    useConditions: { missing_field: "problema_principal" },
    exclusionConditions: { stop_contact: false, opted_out: false },
    requiredVariables: [],
    variableFallbacks: {},
    cta: "Descrever o obstáculo",
    behavioralPrinciple: "Progressão gradual",
    primaryKpi: "Problema preenchido",
    priority: 88,
    executionMode: "assisted",
  },
  {
    code: "QUALIFY_03",
    name: "Consequência",
    family: "qualification",
    subfamily: "consequencia",
    pipelineStage: "qualificacao",
    objective: "Identificar a consequência de não agir",
    description: "Guardar contexto para argumentação comercial.",
    messageBody:
      "Percebo. E se mantiver tudo como está atualmente, isso terá algum impacto relevante nos próximos meses?",
    timingMinMinutes: 0,
    timingMaxMinutes: 120,
    useConditions: { missing_field: "consequencia" },
    exclusionConditions: { stop_contact: false, opted_out: false },
    requiredVariables: [],
    variableFallbacks: {},
    cta: "Descrever o impacto",
    behavioralPrinciple: "Aversão à perda apenas quando a perda é real",
    primaryKpi: "Consequência preenchida",
    priority: 84,
    executionMode: "assisted",
  },
  {
    code: "QUALIFY_04",
    name: "Timing",
    family: "qualification",
    subfamily: "timing",
    pipelineStage: "qualificacao",
    objective: "Classificar a intenção",
    description: "Classifica a lead como quente, morna ou exploratória.",
    messageBody:
      "Faz sentido.\n\nE está a analisar isto para avançar em breve ou está ainda numa fase de perceber as opções disponíveis?",
    timingMinMinutes: 0,
    timingMaxMinutes: 120,
    useConditions: { missing_field: "timing" },
    exclusionConditions: { stop_contact: false, opted_out: false },
    requiredVariables: [],
    variableFallbacks: {},
    cta: "Indicar o horizonte temporal",
    behavioralPrinciple: "Autonomia",
    primaryKpi: "Timing classificado",
    priority: 82,
    executionMode: "assisted",
  },
  {
    code: "QUALIFY_05",
    name: "Transição para agendamento",
    family: "qualification",
    subfamily: "agendamento",
    pipelineStage: "qualificacao",
    objective: "Marcar reunião",
    description: "Usar depois de recolhido o problema principal.",
    messageBody:
      "Pelo que me explicou, {{primeiro_nome}}, penso que faz sentido analisarmos consigo {{problema_principal}} e perceber qual seria a solução mais adequada.\n\n" +
      "Podemos fazer uma conversa rápida de {{duracao_reuniao}} minutos.\n\nÉ mais fácil para si de manhã ou à tarde?",
    timingMinMinutes: 0,
    timingMaxMinutes: 240,
    useConditions: { has_field: "problema_principal", has_meeting: false },
    exclusionConditions: { stop_contact: false, opted_out: false, has_meeting: true },
    requiredVariables: ["primeiro_nome", "problema_principal", "duracao_reuniao"],
    variableFallbacks: { duracao_reuniao: "15" },
    cta: "Escolher manhã ou tarde",
    behavioralPrinciple: "Microcompromisso + escolha binária",
    primaryKpi: "Reuniões agendadas",
    priority: 92,
    executionMode: "assisted",
  },
];

export const PLAYBOOK_SEEDS: PlaybookTemplateSeed[] = [...LEAD_NEW_SEEDS, ...QUALIFY_SEEDS];

export function getSeedByCode(code: string): PlaybookTemplateSeed | undefined {
  return PLAYBOOK_SEEDS.find((s) => s.code === code);
}
