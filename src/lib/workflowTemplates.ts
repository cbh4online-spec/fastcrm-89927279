/**
 * Pre-defined CRM Workflow Templates
 * 
 * These can be used to seed the workflow_definitions table
 * or as templates for creating new workflows.
 */

import type { WorkflowStepConfig } from '@/types/workflows';

export interface WorkflowTemplate {
  code: string;
  name: string;
  description: string;
  category: 'lead' | 'opportunity' | 'client' | 'general';
  steps: WorkflowStepConfig[];
}

export const CRM_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    code: 'lead_qualification_followup',
    name: 'Follow-up de Qualificação de Lead',
    description: 'Cria tarefa e notificação após qualificação de lead',
    category: 'lead',
    steps: [
      {
        code: 'log_qualification',
        type: 'log_activity',
        name: 'Registar Qualificação',
        input: {
          activityType: 'qualification',
          title: 'Lead qualificado via IA',
          description: 'Qualificação automática baseada em análise de agente',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'create_followup_task',
        type: 'create_task',
        name: 'Criar Tarefa de Follow-up',
        input: {
          title: 'Contactar lead qualificado',
          description: 'Lead qualificado pela IA - fazer primeiro contacto',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'fail',
      },
      {
        code: 'notify_owner',
        type: 'send_notification',
        name: 'Notificar Responsável',
        input: {
          type: 'lead_qualified',
          title: 'Lead Qualificado',
          message: 'Um novo lead foi qualificado e requer atenção',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'opportunity_stage_change',
    name: 'Ações de Mudança de Etapa',
    description: 'Executa ações quando oportunidade muda de etapa',
    category: 'opportunity',
    steps: [
      {
        code: 'log_stage_change',
        type: 'log_activity',
        name: 'Registar Mudança',
        input: {
          activityType: 'stage_change',
          title: 'Etapa alterada',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'notify_team',
        type: 'send_notification',
        name: 'Notificar Equipa',
        input: {
          type: 'opportunity_update',
          title: 'Oportunidade Atualizada',
          message: 'A etapa da oportunidade foi alterada',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'client_onboarding',
    name: 'Onboarding de Cliente',
    description: 'Workflow de boas-vindas para novos clientes',
    category: 'client',
    steps: [
      {
        code: 'create_welcome_task',
        type: 'create_task',
        name: 'Tarefa de Boas-vindas',
        input: {
          title: 'Enviar kit de boas-vindas',
          description: 'Preparar e enviar materiais de onboarding',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
      {
        code: 'schedule_kickoff',
        type: 'create_task',
        name: 'Agendar Kickoff',
        input: {
          title: 'Agendar reunião de kickoff',
          description: 'Marcar primeira reunião com o cliente',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
      {
        code: 'log_onboarding',
        type: 'log_activity',
        name: 'Registar Onboarding',
        input: {
          activityType: 'onboarding_started',
          title: 'Onboarding iniciado',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'deal_won',
    name: 'Negócio Ganho',
    description: 'Ações automáticas quando um negócio é fechado com sucesso',
    category: 'opportunity',
    steps: [
      {
        code: 'log_won',
        type: 'log_activity',
        name: 'Registar Vitória',
        input: {
          activityType: 'deal_won',
          title: 'Negócio fechado com sucesso',
          description: 'Oportunidade convertida em cliente',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'notify_team_won',
        type: 'send_notification',
        name: 'Notificar Equipa',
        input: {
          type: 'deal_won',
          title: '🎉 Negócio Ganho!',
          message: 'Parabéns! Um novo negócio foi fechado com sucesso.',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'create_onboarding_task',
        type: 'create_task',
        name: 'Iniciar Onboarding',
        input: {
          title: 'Iniciar processo de onboarding',
          description: 'Cliente novo - preparar onboarding completo',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'deal_lost',
    name: 'Negócio Perdido',
    description: 'Análise e follow-up quando um negócio é perdido',
    category: 'opportunity',
    steps: [
      {
        code: 'log_lost',
        type: 'log_activity',
        name: 'Registar Perda',
        input: {
          activityType: 'deal_lost',
          title: 'Negócio perdido',
          description: 'Oportunidade não convertida',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'create_analysis_task',
        type: 'create_task',
        name: 'Analisar Motivo',
        input: {
          title: 'Analisar razão da perda',
          description: 'Documentar motivos e lições aprendidas',
          priority: 'medium',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
      {
        code: 'schedule_future_contact',
        type: 'create_task',
        name: 'Agendar Recontacto',
        input: {
          title: 'Recontactar em 6 meses',
          description: 'Verificar se situação do prospect mudou',
          priority: 'low',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'lead_inactivity_alert',
    name: 'Alerta de Inatividade de Lead',
    description: 'Notifica quando um lead está inativo há muito tempo',
    category: 'lead',
    steps: [
      {
        code: 'check_inactivity',
        type: 'condition_check',
        name: 'Verificar Inatividade',
        input: {
          condition: 'days_since_last_activity > 14',
        },
        timeout_ms: 5000,
        max_retries: 1,
        on_error: 'fail',
      },
      {
        code: 'notify_inactivity',
        type: 'send_notification',
        name: 'Alerta de Inatividade',
        input: {
          type: 'lead_inactive',
          title: '⚠️ Lead Inativo',
          message: 'Este lead não tem atividade há mais de 14 dias',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
      {
        code: 'create_followup_task',
        type: 'create_task',
        name: 'Tarefa de Reativação',
        input: {
          title: 'Reativar lead inativo',
          description: 'Lead sem atividade - tentar reengajar',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
    ],
  },
  {
    code: 'proposal_followup',
    name: 'Follow-up de Proposta',
    description: 'Acompanhamento automático após envio de proposta',
    category: 'opportunity',
    steps: [
      {
        code: 'wait_for_response',
        type: 'wait',
        name: 'Aguardar Resposta',
        input: {
          duration_hours: 72, // 3 dias
        },
        timeout_ms: 5000,
        max_retries: 1,
        on_error: 'continue',
      },
      {
        code: 'check_proposal_status',
        type: 'condition_check',
        name: 'Verificar Estado',
        input: {
          condition: 'proposal_status == pending',
        },
        timeout_ms: 5000,
        max_retries: 1,
        on_error: 'continue',
      },
      {
        code: 'create_followup',
        type: 'create_task',
        name: 'Follow-up Proposta',
        input: {
          title: 'Follow-up de proposta pendente',
          description: 'Proposta enviada há 3 dias sem resposta - fazer follow-up',
          priority: 'high',
        },
        timeout_ms: 5000,
        max_retries: 3,
        on_error: 'continue',
      },
      {
        code: 'notify_owner',
        type: 'send_notification',
        name: 'Notificar Responsável',
        input: {
          type: 'proposal_pending',
          title: 'Proposta Aguarda Resposta',
          message: 'Uma proposta está pendente há 3 dias e precisa de follow-up',
        },
        timeout_ms: 5000,
        max_retries: 2,
        on_error: 'continue',
      },
    ],
  },
];

export function getWorkflowTemplate(code: string): WorkflowTemplate | undefined {
  return CRM_WORKFLOW_TEMPLATES.find(t => t.code === code);
}

export function getWorkflowsByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return CRM_WORKFLOW_TEMPLATES.filter(t => t.category === category);
}
