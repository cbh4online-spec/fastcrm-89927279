import { AutomationTrigger, AutomationActionType, ConditionOperator } from "@/hooks/useAutomations";

export interface AutomationRecipeCondition {
  field_name: string;
  operator: ConditionOperator;
  value: string | null;
}

export interface AutomationRecipeAction {
  action_type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  category: "inbox" | "sales" | "proposals" | "follow-up";
  trigger: AutomationTrigger;
  trigger_config?: Record<string, unknown>;
  conditions: AutomationRecipeCondition[];
  actions: AutomationRecipeAction[];
  icon: string;
  color: string;
}

export const INBOX_AUTOMATION_RECIPES: AutomationRecipe[] = [
  // Recipe 1: New message → classify → notify user
  {
    id: "inbox-classify-notify",
    name: "Classificar e Notificar",
    description: "Quando uma nova mensagem chega, classifica a conversa e notifica o utilizador responsável",
    category: "inbox",
    trigger: "message_received",
    trigger_config: {
      channels: ["instagram", "whatsapp", "email"],
    },
    conditions: [],
    actions: [
      {
        action_type: "notify_user",
        config: {
          message: "Nova mensagem recebida de {{lead.name}} via {{conversation.channel}}",
          notify_type: "push",
        },
      },
    ],
    icon: "MessageSquare",
    color: "bg-blue-500",
  },
  
  // Recipe 2: New sales intent → create opportunity
  {
    id: "inbox-sales-opportunity",
    name: "Intenção de Venda → Oportunidade",
    description: "Quando a IA detecta intenção de compra numa conversa, cria automaticamente uma oportunidade",
    category: "sales",
    trigger: "message_received",
    trigger_config: {
      channels: ["instagram", "whatsapp", "email"],
    },
    conditions: [
      {
        field_name: "ai_intent",
        operator: "equals",
        value: "purchase",
      },
    ],
    actions: [
      {
        action_type: "create_opportunity",
        config: {
          title: "Oportunidade de {{lead.name}}",
          source: "inbox_ai_detection",
        },
      },
      {
        action_type: "add_tag",
        config: {
          tag: "intenção-compra",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "🎯 Intenção de compra detectada! Lead: {{lead.name}}",
          notify_type: "push",
        },
      },
    ],
    icon: "Target",
    color: "bg-green-500",
  },
  
  // Recipe 3: No reply after 24h → suggest follow-up
  {
    id: "inbox-no-reply-followup",
    name: "Sem Resposta 24h → Follow-up",
    description: "Quando não há resposta do cliente após 24 horas, sugere um follow-up",
    category: "follow-up",
    trigger: "conversation_no_reply",
    trigger_config: {
      no_reply_hours: 24,
      channels: ["instagram", "whatsapp", "email"],
    },
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Follow-up: {{lead.name}} - sem resposta há 24h",
          due_in_hours: 2,
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "⏰ {{lead.name}} não respondeu há 24h. Considera enviar um follow-up.",
          notify_type: "push",
        },
      },
    ],
    icon: "Clock",
    color: "bg-yellow-500",
  },
  
  // Recipe 4: Proposal sent → watch replies
  {
    id: "inbox-proposal-watch",
    name: "Proposta Enviada → Monitorar Respostas",
    description: "Após enviar uma proposta, monitora respostas do cliente e notifica sobre interesse",
    category: "proposals",
    trigger: "message_received",
    trigger_config: {
      channels: ["instagram", "whatsapp", "email"],
    },
    conditions: [
      {
        field_name: "lead.has_pending_proposal",
        operator: "equals",
        value: "true",
      },
    ],
    actions: [
      {
        action_type: "add_tag",
        config: {
          tag: "resposta-proposta",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "📨 {{lead.name}} respondeu! Tem proposta pendente.",
          notify_type: "push",
          priority: "high",
        },
      },
    ],
    icon: "FileText",
    color: "bg-purple-500",
  },
  
  // Recipe 5: Proposal paid → close opportunity
  {
    id: "inbox-proposal-paid-close",
    name: "Proposta Paga → Fechar Oportunidade",
    description: "Quando uma proposta é paga, fecha automaticamente a oportunidade como ganha",
    category: "proposals",
    trigger: "proposal_paid",
    trigger_config: {},
    conditions: [],
    actions: [
      {
        action_type: "move_opportunity_stage",
        config: {
          stage_name: "Fechado Ganho",
          status: "won",
        },
      },
      {
        action_type: "change_lead_status",
        config: {
          status: "customer",
        },
      },
      {
        action_type: "add_tag",
        config: {
          tag: "cliente-pagante",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "🎉 Proposta paga! {{lead.name}} é agora cliente.",
          notify_type: "push",
          priority: "high",
        },
      },
    ],
    icon: "CheckCircle",
    color: "bg-emerald-500",
  },
];

// Additional useful recipes
export const EXTENDED_INBOX_RECIPES: AutomationRecipe[] = [
  {
    id: "inbox-first-message-welcome",
    name: "1ª Mensagem → Boas-vindas",
    description: "Quando um novo lead envia a primeira mensagem, envia uma resposta de boas-vindas",
    category: "inbox",
    trigger: "first_message_from_lead",
    trigger_config: {
      channels: ["instagram", "whatsapp"],
    },
    conditions: [],
    actions: [
      {
        action_type: "send_template_message",
        config: {
          template_type: "welcome",
          delay_seconds: 30,
        },
      },
      {
        action_type: "add_tag",
        config: {
          tag: "novo-lead",
        },
      },
    ],
    icon: "UserPlus",
    color: "bg-indigo-500",
  },
  {
    id: "inbox-high-priority-escalate",
    name: "Prioridade Alta → Escalar",
    description: "Quando a IA detecta alta prioridade, notifica gestor e atribui a equipa sénior",
    category: "inbox",
    trigger: "conversation_priority_changed",
    trigger_config: {
      priority_to: "high",
    },
    conditions: [],
    actions: [
      {
        action_type: "notify_user",
        config: {
          message: "🚨 Conversa de alta prioridade: {{lead.name}}",
          notify_type: "push",
          priority: "urgent",
        },
      },
      {
        action_type: "add_tag",
        config: {
          tag: "prioridade-alta",
        },
      },
    ],
    icon: "AlertTriangle",
    color: "bg-red-500",
  },
  {
    id: "inbox-resolved-feedback",
    name: "Conversa Resolvida → Pedir Feedback",
    description: "Quando uma conversa é resolvida, agenda tarefa para pedir feedback ao cliente",
    category: "follow-up",
    trigger: "conversation_resolved",
    trigger_config: {},
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Pedir feedback a {{lead.name}}",
          due_in_hours: 24,
        },
      },
    ],
    icon: "ThumbsUp",
    color: "bg-teal-500",
  },
];

export const ALL_AUTOMATION_RECIPES = [...INBOX_AUTOMATION_RECIPES, ...EXTENDED_INBOX_RECIPES];

export function getRecipeById(id: string): AutomationRecipe | undefined {
  return ALL_AUTOMATION_RECIPES.find((r) => r.id === id);
}

export function getRecipesByCategory(category: AutomationRecipe["category"]): AutomationRecipe[] {
  return ALL_AUTOMATION_RECIPES.filter((r) => r.category === category);
}
