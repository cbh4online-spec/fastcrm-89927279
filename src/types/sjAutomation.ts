/**
 * Student Journey Automation Types and Templates
 * Module-specific automations for educational/training workflows
 */

// Trigger types specific to Student Journey
export type SJTriggerType =
  | "profile_created"
  | "stage_changed"
  | "interest_added"
  | "enrollment_created"
  | "enrollment_status_changed"
  | "enrollment_inactive"
  | "enrollment_completed"
  | "dropout_risk_changed"
  | "touchpoint_created"
  | "follow_up_due";

// Action types for SJ automations
export type SJActionType =
  | "create_task"
  | "update_dropout_risk"
  | "create_touchpoint"
  | "schedule_follow_up"
  | "send_message"
  | "create_ai_suggestion"
  | "update_stage"
  | "add_note";

// Condition operators
export type SJConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"
  | "days_since";

export interface SJAutomationCondition {
  field: string;
  operator: SJConditionOperator;
  value?: string | number | boolean;
}

export interface SJAutomationAction {
  type: SJActionType;
  config: Record<string, unknown>;
}

export interface SJAutomation {
  id: string;
  name: string;
  description: string;
  triggerType: SJTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: SJAutomationCondition[];
  actions: SJAutomationAction[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
}

// UI Labels
export const SJ_TRIGGER_LABELS: Record<SJTriggerType, string> = {
  profile_created: "Perfil criado",
  stage_changed: "Stage alterado",
  interest_added: "Interesse adicionado",
  enrollment_created: "Inscrição criada",
  enrollment_status_changed: "Status da inscrição alterado",
  enrollment_inactive: "Inscrição sem atividade",
  enrollment_completed: "Inscrição concluída",
  dropout_risk_changed: "Risco de desistência alterado",
  touchpoint_created: "Touchpoint criado",
  follow_up_due: "Follow-up pendente",
};

export const SJ_ACTION_LABELS: Record<SJActionType, string> = {
  create_task: "Criar tarefa",
  update_dropout_risk: "Atualizar risco de desistência",
  create_touchpoint: "Criar touchpoint",
  schedule_follow_up: "Agendar follow-up",
  send_message: "Enviar mensagem",
  create_ai_suggestion: "Criar sugestão IA",
  update_stage: "Atualizar stage",
  add_note: "Adicionar nota",
};

export const SJ_STAGE_VALUES = [
  "lead",
  "interested",
  "applied",
  "enrolled",
  "active",
  "completed",
  "dropped",
  "churned",
] as const;

export type SJStageValue = (typeof SJ_STAGE_VALUES)[number];

export const SJ_STAGE_LABELS: Record<SJStageValue, string> = {
  lead: "Lead",
  interested: "Interessado",
  applied: "Candidato",
  enrolled: "Inscrito",
  active: "Ativo",
  completed: "Concluído",
  dropped: "Desistiu",
  churned: "Churn",
};

// Default automation templates for Student Journey
export const DEFAULT_SJ_AUTOMATIONS: Omit<
  SJAutomation,
  "id" | "createdAt" | "updatedAt" | "workspaceId"
>[] = [
  // 1. Novo perfil criado (stage=lead) → criar tarefa "Qualificar interesse"
  {
    name: "Qualificar novo lead",
    description:
      "Quando um novo perfil é criado como lead, criar tarefa para qualificar interesse",
    triggerType: "profile_created",
    triggerConfig: {},
    conditions: [
      {
        field: "stage",
        operator: "equals",
        value: "lead",
      },
    ],
    actions: [
      {
        type: "create_task",
        config: {
          title: "Qualificar interesse - {{profile_name}}",
          description:
            "Contactar o potencial aluno para entender os seus interesses e objetivos de formação.",
          priority: "high",
          dueDays: 2,
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 2. Interesse identificado → sugerir convite + follow-up em 48h
  {
    name: "Follow-up após interesse",
    description:
      "Quando um interesse é identificado, agendar follow-up e sugerir convite",
    triggerType: "interest_added",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "schedule_follow_up",
        config: {
          hoursFromNow: 48,
          reason: "Interesse identificado - acompanhar conversão",
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "invite",
          message:
            "Considerar enviar convite para sessão informativa ou webinar relacionado aos interesses identificados.",
          priority: "medium",
        },
      },
      {
        type: "update_stage",
        config: {
          newStage: "interested",
          onlyIfCurrentStage: "lead",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 3. Inscrição ativa sem atividade (7 dias) → dropout_risk medium + tarefa
  {
    name: "Alerta inatividade 7 dias",
    description:
      "Inscrição sem atividade há 7 dias - aumentar risco e criar tarefa",
    triggerType: "enrollment_inactive",
    triggerConfig: {
      inactiveDays: 7,
      checkFrequency: "daily",
    },
    conditions: [
      {
        field: "enrollment_status",
        operator: "equals",
        value: "active",
      },
      {
        field: "dropout_risk",
        operator: "not_equals",
        value: "high",
      },
    ],
    actions: [
      {
        type: "update_dropout_risk",
        config: {
          newRisk: "medium",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Reativar aluno inativo - {{profile_name}}",
          description:
            "Aluno sem atividade há 7 dias. Contactar para verificar situação e oferecer suporte.",
          priority: "medium",
          dueDays: 1,
        },
      },
      {
        type: "create_touchpoint",
        config: {
          type: "system_alert",
          message: "Sistema: Alerta de inatividade (7 dias)",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 3b. Inscrição ativa sem atividade (14 dias) → dropout_risk high + tarefa urgente + mensagem
  {
    name: "Alerta crítico inatividade 14 dias",
    description:
      "Inscrição sem atividade há 14 dias - risco alto, tarefa urgente e mensagem",
    triggerType: "enrollment_inactive",
    triggerConfig: {
      inactiveDays: 14,
      checkFrequency: "daily",
    },
    conditions: [
      {
        field: "enrollment_status",
        operator: "equals",
        value: "active",
      },
    ],
    actions: [
      {
        type: "update_dropout_risk",
        config: {
          newRisk: "high",
        },
      },
      {
        type: "create_task",
        config: {
          title: "URGENTE: Prevenir desistência - {{profile_name}}",
          description:
            "Aluno em risco alto de desistência (14+ dias sem atividade). Ação imediata necessária.",
          priority: "high",
          dueDays: 0,
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "retention",
          message:
            "Considerar oferecer sessão de tutoria gratuita ou flexibilização de prazo para reter o aluno.",
          priority: "high",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 4. Conclusão → touchpoint "parabéns" + sugestão de próxima formação
  {
    name: "Celebrar conclusão e sugerir continuação",
    description:
      "Quando uma inscrição é concluída, criar touchpoint de parabéns e sugerir próxima formação",
    triggerType: "enrollment_completed",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "create_touchpoint",
        config: {
          type: "milestone",
          outcome: "positive",
          message:
            "🎉 Parabéns pela conclusão do curso {{course_name}}! Certificado disponível.",
        },
      },
      {
        type: "update_stage",
        config: {
          newStage: "completed",
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "upsell",
          message:
            "Sugerir próxima formação baseada nos interesses: {{interests}}. Considerar oferta especial para alumni.",
          priority: "medium",
        },
      },
      {
        type: "schedule_follow_up",
        config: {
          hoursFromNow: 168, // 7 days
          reason: "Follow-up pós-conclusão - apresentar próximas formações",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },
];

// Helper to get trigger icon
export function getSJTriggerIcon(trigger: SJTriggerType): string {
  const icons: Record<SJTriggerType, string> = {
    profile_created: "UserPlus",
    stage_changed: "ArrowRightLeft",
    interest_added: "Sparkles",
    enrollment_created: "GraduationCap",
    enrollment_status_changed: "RefreshCw",
    enrollment_inactive: "Clock",
    enrollment_completed: "CheckCircle",
    dropout_risk_changed: "AlertTriangle",
    touchpoint_created: "MessageCircle",
    follow_up_due: "Bell",
  };
  return icons[trigger] || "Zap";
}

// Helper to get action icon
export function getSJActionIcon(action: SJActionType): string {
  const icons: Record<SJActionType, string> = {
    create_task: "CheckSquare",
    update_dropout_risk: "AlertTriangle",
    create_touchpoint: "MessageCircle",
    schedule_follow_up: "Calendar",
    send_message: "Send",
    create_ai_suggestion: "Sparkles",
    update_stage: "ArrowRight",
    add_note: "FileText",
  };
  return icons[action] || "Zap";
}
