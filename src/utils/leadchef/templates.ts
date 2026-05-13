/**
 * LeadChef — Categorias de templates e templates padrão (Fase 9).
 */

export type LeadChefTemplateCategory =
  | "first_contact"
  | "demo_confirmation"
  | "demo_reminder"
  | "post_demo_follow_up"
  | "proposal_follow_up"
  | "referral_request"
  | "referral_first_contact"
  | "post_sale"
  | "cooking_class_invite"
  | "reactivation"
  | "recruitment_conversation"
  | "thank_you"
  | "custom";

export const LEADCHEF_TEMPLATE_CATEGORIES: LeadChefTemplateCategory[] = [
  "first_contact",
  "demo_confirmation",
  "demo_reminder",
  "post_demo_follow_up",
  "proposal_follow_up",
  "referral_request",
  "referral_first_contact",
  "post_sale",
  "cooking_class_invite",
  "reactivation",
  "recruitment_conversation",
  "thank_you",
  "custom",
];

export const LEADCHEF_TEMPLATE_CATEGORY_LABELS: Record<LeadChefTemplateCategory, string> = {
  first_contact: "Primeiro contacto",
  demo_confirmation: "Confirmação de demonstração",
  demo_reminder: "Lembrete de demonstração",
  post_demo_follow_up: "Follow-up pós-demonstração",
  proposal_follow_up: "Follow-up de proposta",
  referral_request: "Pedido de referência",
  referral_first_contact: "Primeiro contacto a referência",
  post_sale: "Pós-venda",
  cooking_class_invite: "Convite para aula",
  reactivation: "Reativação",
  recruitment_conversation: "Conversa de recrutamento",
  thank_you: "Agradecimento",
  custom: "Personalizado",
};

export interface LeadChefDefaultTemplate {
  category: LeadChefTemplateCategory;
  name: string;
  body: string;
}

export const LEADCHEF_DEFAULT_TEMPLATES: LeadChefDefaultTemplate[] = [
  {
    category: "first_contact",
    name: "Primeiro contacto",
    body:
      "Olá {{firstName}}, tudo bem? Sou {{agentName}}. Recebi o teu contacto sobre uma experiência culinária e gostava de perceber melhor como te posso ajudar. Tens disponibilidade para falarmos hoje?",
  },
  {
    category: "demo_confirmation",
    name: "Confirmação de demonstração",
    body:
      "Olá {{firstName}}, confirmo a nossa demonstração para {{appointmentDate}} às {{appointmentTime}}. Qualquer alteração diz-me, por favor. Até já!",
  },
  {
    category: "demo_reminder",
    name: "Lembrete de demonstração",
    body:
      "Olá {{firstName}}, só para lembrar a nossa demonstração marcada para {{appointmentTime}}. Até já!",
  },
  {
    category: "post_demo_follow_up",
    name: "Follow-up pós-demonstração",
    body:
      "Olá {{firstName}}, obrigada pelo tempo de hoje. Gostava de saber o que achaste da experiência e se ficou alguma dúvida que eu possa esclarecer.",
  },
  {
    category: "proposal_follow_up",
    name: "Follow-up de proposta",
    body:
      "Olá {{firstName}}, estou a dar seguimento à proposta que vimos. Queres que te ajude a comparar as opções ou esclarecer algum ponto?",
  },
  {
    category: "referral_request",
    name: "Pedido de referência",
    body:
      "Olá {{firstName}}, lembrei-me de te perguntar: conheces alguém que pudesse gostar de uma experiência culinária como a que fizemos? Se sim, posso contactar com a tua autorização.",
  },
  {
    category: "referral_first_contact",
    name: "Primeiro contacto a referência",
    body:
      "Olá {{firstName}}, tudo bem? O teu contacto foi-me indicado por {{referrerName}}, que achou que poderias gostar de conhecer uma experiência culinária personalizada. Posso explicar-te melhor?",
  },
  {
    category: "post_sale",
    name: "Pós-venda",
    body:
      "Olá {{firstName}}, como está a correr a utilização do equipamento? Queria marcar contigo um acompanhamento rápido para te ajudar a tirar mais partido no dia a dia.",
  },
  {
    category: "cooking_class_invite",
    name: "Convite para aula",
    body:
      "Olá {{firstName}}, vou organizar uma aula de cozinha e lembrei-me de ti. Gostarias de participar?",
  },
  {
    category: "reactivation",
    name: "Reativação",
    body:
      "Olá {{firstName}}, tudo bem? Ficámos de falar mais tarde sobre uma experiência culinária. Ainda faz sentido retomarmos a conversa?",
  },
  {
    category: "thank_you",
    name: "Agradecimento",
    body: "Olá {{firstName}}, obrigada pela disponibilidade. Qualquer questão, estou por aqui.",
  },
  {
    category: "cooking_class_invite",
    name: "Lista de Compras Demo Bebé 4–6 meses",
    body:
      "🛒 *Lista de Compras Demo Bebé 4–6 meses*\n\n" +
      "🍚 *Cereais e Legumes Secos*\n" +
      "☐ Arroz — 200 g\n\n" +
      "🍎 *Frutas*\n" +
      "☐ Banana — 30 g\n" +
      "☐ Maçã — 780 g\n\n" +
      "🫒 *Gorduras*\n" +
      "☐ Azeite extra virgem — 6 c. chá\n\n" +
      "🍼 *Laticínios*\n" +
      "☐ Leite em pó para lactentes — 150 g\n\n" +
      "🥬 *Legumes e Ervas Aromáticas*\n" +
      "☐ Alface — 50 g\n" +
      "☐ Batata — 300 g\n" +
      "☐ Cebola — 200 g\n" +
      "☐ Cenoura — 500 g",
  },
  {
    category: "cooking_class_invite",
    name: "Lista de Compras Demo Bebé 6–9 meses",
    body:
      "🛒 *Lista de Compras Demo Bebé 6–9 meses*\n\n" +
      "🍗 *Carnes*\n" +
      "☐ Frango — 120 g\n\n" +
      "🍚 *Cereais e Legumes Secos*\n" +
      "☐ Arroz — 200 g\n\n" +
      "🍎 *Frutas*\n" +
      "☐ Banana — 30 g\n" +
      "☐ Maçã — 780 g\n\n" +
      "🫒 *Gorduras*\n" +
      "☐ Azeite extra virgem — 6 c. chá\n\n" +
      "🍼 *Laticínios*\n" +
      "☐ Leite em pó para lactentes — 150 g\n\n" +
      "🥕 *Legumes e Ervas Aromáticas*\n" +
      "☐ Cenoura — 250 g\n" +
      "☐ Chuchu — 200 g\n" +
      "☐ Curgete — 500 g\n" +
      "☐ Nabiças — 100 g",
  },
  {
    category: "cooking_class_invite",
    name: "Lista de Compras Degustação Carne",
    body:
      "🛒 *Lista de Compras Degustação Carne*\n\n" +
      "🍓 *Frutas*\n" +
      "☐ Frutos vermelhos congelados — 500 g\n" +
      "☐ Limões — 3 un.\n\n" +
      "🥚 *Mercearia*\n" +
      "☐ Açúcar\n" +
      "☐ Ovo — 1 un.\n" +
      "☐ Farinha (preferencialmente tipo 65)\n" +
      "☐ Azeite\n" +
      "☐ Fermento de padeiro — 1 saqueta\n" +
      "☐ Mostarda\n" +
      "☐ Pickles\n\n" +
      "🥓 *Charcutaria e Queijo*\n" +
      "☐ Bacon fatiado — 100 g\n" +
      "☐ Fiambre fatiado — 100 g\n" +
      "☐ Chouriço fatiado — 100 g\n" +
      "☐ Paio fatiado — 100 g\n" +
      "☐ Queijo fatiado — 100 g\n\n" +
      "🥩 *Carne*\n" +
      "☐ Carne cortada em tiras para pica-pau — 250 g\n\n" +
      "🧄 *Legumes e Aromáticos*\n" +
      "☐ Alho\n\n" +
      "🍺 *Bebidas*\n" +
      "☐ Cerveja\n\n" +
      "🧻 *Outros*\n" +
      "☐ Papel vegetal\n\n" +
      "👥 *Porções sugeridas*\n" +
      "• Base para 4 a 6 pessoas em formato degustação.\n" +
      "• Para grupos maiores, multiplica as quantidades de charcutaria, queijo e pica-pau proporcionalmente.\n\n" +
      "📝 *Instruções de preparação*\n" +
      "1. Retira a charcutaria e o queijo do frigorífico cerca de 20 min antes de servir.\n" +
      "2. Pica o alho e tempera a carne para o pica-pau com alho, mostarda, sal, pimenta e um fio de cerveja. Deixa marinar.\n" +
      "3. Prepara a massa de pão na Bimby (farinha tipo 65, fermento, água morna, sal e azeite) e deixa levedar tapada.\n" +
      "4. Faz o coulis de frutos vermelhos com o açúcar e o sumo dos limões na Bimby — reserva para o final.\n" +
      "5. Forma os pães em papel vegetal e leva ao forno pré-aquecido a 200 °C até dourar.\n" +
      "6. Saltea a carne do pica-pau bem quente, finaliza com cerveja e serve com pickles.\n" +
      "7. Monta a tábua com charcutaria, queijo, pão quente e pickles. Sobremesa com o coulis de frutos vermelhos.",
  },
  {
    category: "demo_confirmation",
    name: "Confirmação momento Bimby",
    body:
      "Olá {{firstName}}, fica marcado o vosso momento Bimby para o dia {{appointmentDate}} às {{appointmentTime}}.\n\n" +
      "Confirma, por favor, se está tudo de acordo com o combinado. Até já! 🙌",
  },
  {
    category: "demo_reminder",
    name: "Lembrete momento Bimby",
    body:
      "Olá {{firstName}}, passo só para lembrar do nosso momento Bimby marcado para {{appointmentDate}} às {{appointmentTime}}.\n\n" +
      "Mantém-se? Qualquer ajuste é só dizer. Até já! 👩‍🍳",
  },
  {
    category: "post_sale",
    name: "Dados para contrato de pronto",
    body:
      "Olá {{firstName}}, para avançarmos com o contrato de pronto pagamento preciso dos seguintes dados:\n\n" +
      "• Nome completo\n" +
      "• Data de nascimento\n" +
      "• Morada\n" +
      "• NIF\n" +
      "• Telemóvel\n" +
      "• E-mail\n\n" +
      "Depois de receber o contrato por e-mail da Vorwerk, assina e vai receber a referência para o pagamento.\n\n" +
      "Após o pagamento, envie-me o comprovativo, por favor. 🙏",
  },
  {
    category: "proposal_follow_up",
    name: "Documentos para aprovação de crédito",
    body:
      "Olá {{firstName}}, para avançarmos com a aprovação de crédito preciso dos seguintes documentos e informações:\n\n" +
      "📄 *Documentos*\n" +
      "• Cartão de Cidadão (PDF ou fotografia legível, sem cortes)\n" +
      "• Comprovativo de morada\n" +
      "• Comprovativo de IBAN\n\n" +
      "📇 *Contactos*\n" +
      "• E-mail\n" +
      "• Telemóvel\n" +
      "• Morada\n\n" +
      "🏠 *Habitação*\n" +
      "• Casa com empréstimo? Há quantos anos?\n\n" +
      "🎓 *Formação académica*\n\n" +
      "💼 *Situação profissional*\n" +
      "• Nome da entidade patronal\n" +
      "• Setor de atividade\n" +
      "• Cargo que exerce\n" +
      "• Há quantos anos\n" +
      "• Telefone do emprego\n" +
      "• Vencimento mensal\n\n" +
      "💍 *Regime de casamento*\n\n" +
      "💶 *Mensalidade escolhida*\n\n" +
      "Assim que tiveres tudo, envia-me por aqui que trato do envio para análise. Obrigada! 🙏",
  },
  {
    category: "demo_confirmation",
    name: "Confirmação de momento Bimby agendado",
    body:
      "Olá {{firstName}}, conforme agendado telefonicamente.\n\n" +
      "Fica marcado o vosso *momento Bimby* para *{{demoDate}}* às *{{demoTime}}*.\n\n" +
      "Relembro que este é o meu trabalho e, caso desmarquem em cima da hora, fico sem trabalhar e sem possibilidade de marcar com outro cliente.\n\n" +
      "Muito grata 🙏\n" +
      "Sandra Silva",
  },
  {
    category: "demo_reminder",
    name: "Lembrete véspera de demonstração",
    body:
      "Olá {{firstName}} ☘️☘️☘️\n\n" +
      "Quero relembrar que temos a nossa marcação amanhã, dia *{{demoDate}}* às *{{demoTime}}*.\n\n" +
      "Espero que já tenha todos os ingredientes necessários para a demonstração. Caso haja alguma dúvida, pode sempre ligar-me.\n\n" +
      "Até amanhã 🙌\n\n" +
      "Da sua agente,\n" +
      "Sandra Silva",
  },
  {
    category: "post_demo_follow_up",
    name: "Poupança mensal — Demo Bebé",
    body:
      "*POUPANÇA MENSAL — DEMO BEBÉ* 👶\n\n" +
      "🍼 *30 Boiões de Maçã / mês*\n" +
      "• Compra: 0,50€ cada\n" +
      "• Bimby: 0,16€ cada\n" +
      "• Poupança por boião: *0,34€*\n" +
      "  ➡️ *Poupança mensal: 10,20€*\n\n" +
      "🥣 *15 Papas de Farinha de Arroz / mês*\n" +
      "• Compra: 0,53€ cada\n" +
      "• Bimby: 0,19€ cada\n" +
      "• Poupança por papa: *0,34€*\n" +
      "  ➡️ *Poupança mensal: 5,10€*\n\n" +
      "🥕 *4 Sopas fora de casa / mês*\n" +
      "• Compra: 1,99€ cada\n" +
      "• Bimby: 0,50€ cada\n" +
      "• Poupança por dose: *1,49€*\n" +
      "  ➡️ *Poupança mensal: 5,96€*\n\n" +
      "*TOTAL POUPADO POR MÊS*\n" +
      "💚 *21,26€*\n\n" +
      "—\n\n" +
      "_E isto sem contar com a restante família._\n\n" +
      "Na receita _“boiões da semana”_ consegues preparar *13 refeições em apenas 30 minutos*.\n\n" +
      "👉 Caro e cansativo é mesmo *não ter uma Bimby* numa fase que devia ser a melhor das nossas vidas.",
  },
];

// ─── Automations defaults ────────────────────────────────────────────────────

export type LeadChefAutomationKey =
  | "lead_no_contact_24h"
  | "demo_done_no_followup"
  | "proposal_pending_3d"
  | "won_no_postsale"
  | "referral_authorized_no_contact"
  | "client_potential_referral"
  | "reactivation_due";

export interface LeadChefAutomationDefault {
  key: LeadChefAutomationKey;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
}

export const LEADCHEF_DEFAULT_AUTOMATIONS: LeadChefAutomationDefault[] = [
  {
    key: "lead_no_contact_24h",
    name: "Lead novo sem contacto",
    description: "Avisa quando um lead novo está há mais de 24h sem contacto.",
    trigger_type: "lead_created_no_contact",
    action_type: "create_alert",
    config: { delayHours: 24, templateCategory: "first_contact" },
    is_enabled: true,
  },
  {
    key: "demo_done_no_followup",
    name: "Demonstração realizada sem follow-up",
    description: "Sugere follow-up no dia seguinte para demonstrações sem próxima ação.",
    trigger_type: "stage_demo_done_no_next",
    action_type: "suggest_action",
    config: { delayHours: 24, templateCategory: "post_demo_follow_up" },
    is_enabled: true,
  },
  {
    key: "proposal_pending_3d",
    name: "Proposta pendente",
    description: "Alerta quando uma proposta está há mais de 3 dias sem decisão.",
    trigger_type: "stage_proposal_pending",
    action_type: "create_alert",
    config: { delayDays: 3, templateCategory: "proposal_follow_up" },
    is_enabled: true,
  },
  {
    key: "won_no_postsale",
    name: "Venda ganha sem pós-venda",
    description: "Sugere marcar pós-venda quando a venda fica fechada sem visita.",
    trigger_type: "stage_won_no_postsale",
    action_type: "suggest_action",
    config: { templateCategory: "post_sale" },
    is_enabled: true,
  },
  {
    key: "referral_authorized_no_contact",
    name: "Referência autorizada sem contacto",
    description: "Avisa quando uma referência autorizada ainda não foi contactada.",
    trigger_type: "referral_authorized_no_contact",
    action_type: "create_alert",
    config: { templateCategory: "referral_first_contact" },
    is_enabled: true,
  },
  {
    key: "client_potential_referral",
    name: "Cliente com potencial de referência",
    description: "Sugere pedido de referência a clientes marcados com potencial.",
    trigger_type: "client_potential_referral",
    action_type: "suggest_action",
    config: { templateCategory: "referral_request" },
    is_enabled: true,
  },
  {
    key: "reactivation_due",
    name: "Reativação futura",
    description: "Avisa quando uma reativação agendada está vencida.",
    trigger_type: "stage_reactivate_later_due",
    action_type: "create_alert",
    config: { templateCategory: "reactivation" },
    is_enabled: true,
  },
];
