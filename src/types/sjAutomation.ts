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
  | "follow_up_due"
  // Phase 4 triggers
  | "scheduled_daily"
  | "cooling_period_ended"
  | "eligible_for_progression";

// Action types for SJ automations
export type SJActionType =
  | "create_task"
  | "update_dropout_risk"
  | "create_touchpoint"
  | "schedule_follow_up"
  | "send_message"
  | "create_ai_suggestion"
  | "update_stage"
  | "add_note"
  // Phase 4 actions
  | "update_lifecycle_stage"
  | "update_activation_potential"
  | "notify_owner"
  | "suggest_personalized_message"
  // Recommendation engine actions
  | "recalculate_recommendations";

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
  // Phase 4
  scheduled_daily: "Verificação diária agendada",
  cooling_period_ended: "Período de reflexão concluído",
  eligible_for_progression: "Elegível para progressão",
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
  // Phase 4
  update_lifecycle_stage: "Atualizar lifecycle stage",
  update_activation_potential: "Atualizar potencial de ativação",
  notify_owner: "Notificar responsável",
  suggest_personalized_message: "Sugerir mensagem personalizada",
  // Recommendation engine
  recalculate_recommendations: "Recalcular recomendações",
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

  // 3b. Inscrição ativa sem atividade (14 dias) → dropout_risk high + tarefa urgente
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

  // ================================================================
  // FASE 4: AUTOMAÇÕES NATIVAS DO LIFECYCLE
  // ================================================================

  // 4. PÓS-CONCLUSÃO: enrollment.status = completed
  {
    name: "Pós-conclusão: Ativar Alumni",
    description:
      "Quando um aluno conclui uma formação, atualiza lifecycle para completed_active e agenda follow-up",
    triggerType: "enrollment_completed",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "update_lifecycle_stage",
        config: {
          newStage: "completed_active",
        },
      },
      {
        type: "schedule_follow_up",
        config: {
          daysFromNow: 30, // 30 dias para período de reflexão
          reason: "Período de reflexão pós-formação - verificar interesse em continuação",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Contato pós-formação - {{profile_name}}",
          description:
            "Aluno concluiu {{course_name}}. Ligar para felicitar e sondar interesse em novas formações após período de reflexão.",
          priority: "medium",
          dueDays: 30,
        },
      },
      {
        type: "create_touchpoint",
        config: {
          type: "milestone",
          outcome: "positive",
          message: "🎓 Conclusão: {{course_name}} - Aguardar período de reflexão (30 dias)",
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "upsell",
          message:
            "Preparar proposta personalizada com base no perfil e formações anteriores. Aguardar período de reflexão antes de contactar.",
          priority: "low",
        },
      },
      {
        type: "recalculate_recommendations",
        config: {
          delayDays: 7, // Recalcular recomendações após 7 dias
          priority: "high",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 5. BASE INSTALADA INATIVA: verificação diária (6 meses)
  {
    name: "Base inativa 6 meses - Potencial médio",
    description:
      "Alumni sem atividade há 6 meses - marcar potencial médio e criar tarefa de reativação",
    triggerType: "scheduled_daily",
    triggerConfig: {
      checkType: "inactive_base",
      inactiveMonths: 6,
    },
    conditions: [
      {
        field: "lifecycle_stage",
        operator: "equals",
        value: "completed_active",
      },
      {
        field: "last_course_completed_at",
        operator: "days_since",
        value: 180, // 6 meses
      },
    ],
    actions: [
      {
        type: "update_activation_potential",
        config: {
          newPotential: "medium",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Reativar alumni - {{profile_name}}",
          description:
            "Alumni sem atividade há 6 meses. Verificar interesse em novas formações ou atualizações na área.",
          priority: "medium",
          dueDays: 7,
        },
      },
      {
        type: "suggest_personalized_message",
        config: {
          messageType: "reactivation",
          channel: "whatsapp",
          template: "reactivation_6m",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 6. BASE INSTALADA INATIVA: 9 meses - potencial alto
  {
    name: "Base inativa 9 meses - Potencial alto",
    description:
      "Alumni sem atividade há 9 meses - potencial alto, tarefa urgente",
    triggerType: "scheduled_daily",
    triggerConfig: {
      checkType: "inactive_base",
      inactiveMonths: 9,
    },
    conditions: [
      {
        field: "lifecycle_stage",
        operator: "equals",
        value: "completed_active",
      },
      {
        field: "last_course_completed_at",
        operator: "days_since",
        value: 270, // 9 meses
      },
      {
        field: "activation_potential",
        operator: "not_equals",
        value: "high",
      },
    ],
    actions: [
      {
        type: "update_activation_potential",
        config: {
          newPotential: "high",
        },
      },
      {
        type: "create_task",
        config: {
          title: "PRIORIDADE: Reativar alumni - {{profile_name}}",
          description:
            "Alumni sem atividade há 9+ meses. Oportunidade de oferecer formação complementar ou atualização.",
          priority: "high",
          dueDays: 3,
        },
      },
      {
        type: "notify_owner",
        config: {
          notificationType: "push",
          title: "Alumni com alto potencial de reativação",
          message: "{{profile_name}} está há 9+ meses sem formação. Considerar contacto prioritário.",
        },
      },
      {
        type: "suggest_personalized_message",
        config: {
          messageType: "exclusive_offer",
          channel: "email",
          template: "alumni_exclusive_9m",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 7. BASE INATIVA 12 MESES - risco de churn
  {
    name: "Base inativa 12 meses - Risco de churn",
    description:
      "Alumni sem atividade há 12 meses - último esforço antes de marcar como inativo",
    triggerType: "scheduled_daily",
    triggerConfig: {
      checkType: "inactive_base",
      inactiveMonths: 12,
    },
    conditions: [
      {
        field: "lifecycle_stage",
        operator: "not_equals",
        value: "inactive",
      },
      {
        field: "last_course_completed_at",
        operator: "days_since",
        value: 365,
      },
    ],
    actions: [
      {
        type: "update_lifecycle_stage",
        config: {
          newStage: "inactive",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Último contacto antes de arquivar - {{profile_name}}",
          description:
            "Alumni inativo há 12+ meses. Tentar contacto final ou arquivar como churned.",
          priority: "low",
          dueDays: 14,
        },
      },
      {
        type: "create_touchpoint",
        config: {
          type: "system_alert",
          message: "Sistema: Marcado como inativo após 12 meses sem atividade",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 8. ELEGÍVEL PARA PROGRESSÃO: período de reflexão terminou + score alto
  {
    name: "Elegível para progressão",
    description:
      "Após período de reflexão (30 dias), verificar se aluno está elegível para nova formação",
    triggerType: "cooling_period_ended",
    triggerConfig: {
      coolingPeriodDays: 30,
    },
    conditions: [
      {
        field: "lifecycle_stage",
        operator: "equals",
        value: "completed_active",
      },
      {
        field: "student_score",
        operator: "greater_than",
        value: 60,
      },
    ],
    actions: [
      {
        type: "update_lifecycle_stage",
        config: {
          newStage: "eligible_progression",
        },
      },
      {
        type: "notify_owner",
        config: {
          notificationType: "push",
          title: "Aluno elegível para progressão",
          message: "{{profile_name}} completou período de reflexão e está elegível para nova formação.",
        },
      },
      {
        type: "create_task",
        config: {
          title: "Propor nova formação - {{profile_name}}",
          description:
            "Aluno concluiu período de reflexão. Score: {{student_score}}. Sugerir formação complementar baseada no histórico.",
          priority: "high",
          dueDays: 3,
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "progression",
          message:
            "Recomendar formações baseadas em: especialidade atual, formações concluídas e interesses identificados. Considerar oferta exclusiva para alumni.",
          priority: "high",
        },
      },
      {
        type: "suggest_personalized_message",
        config: {
          messageType: "progression_invite",
          channel: "whatsapp",
          template: "exclusive_alumni_invite",
        },
      },
    ],
    isActive: true,
    isSystem: true,
  },

  // 9. ALUMNI ESTRATÉGICO: múltiplas conclusões
  {
    name: "Promover a Alumni Estratégico",
    description:
      "Quando aluno completa 3+ formações, promover a alumni estratégico",
    triggerType: "enrollment_completed",
    triggerConfig: {},
    conditions: [
      {
        field: "total_courses_completed",
        operator: "greater_than",
        value: 2,
      },
    ],
    actions: [
      {
        type: "update_lifecycle_stage",
        config: {
          newStage: "alumni",
        },
      },
      {
        type: "create_touchpoint",
        config: {
          type: "milestone",
          outcome: "positive",
          message: "⭐ Promovido a Alumni Estratégico - {{total_courses_completed}} formações concluídas!",
        },
      },
      {
        type: "notify_owner",
        config: {
          notificationType: "push",
          title: "Novo Alumni Estratégico!",
          message: "{{profile_name}} completou {{total_courses_completed}} formações e foi promovido a alumni estratégico.",
        },
      },
      {
        type: "create_ai_suggestion",
        config: {
          suggestionType: "vip_treatment",
          message:
            "Considerar tratamento VIP: acesso antecipado a novas formações, descontos exclusivos, convite para eventos.",
          priority: "high",
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
    // Phase 4
    scheduled_daily: "CalendarClock",
    cooling_period_ended: "Timer",
    eligible_for_progression: "TrendingUp",
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
    // Phase 4
    update_lifecycle_stage: "RefreshCw",
    update_activation_potential: "Gauge",
    notify_owner: "BellRing",
    suggest_personalized_message: "MessageSquareText",
    // Recommendation engine
    recalculate_recommendations: "Target",
  };
  return icons[action] || "Zap";
}
