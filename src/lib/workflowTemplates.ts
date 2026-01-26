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
];

export function getWorkflowTemplate(code: string): WorkflowTemplate | undefined {
  return CRM_WORKFLOW_TEMPLATES.find(t => t.code === code);
}

export function getWorkflowsByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return CRM_WORKFLOW_TEMPLATES.filter(t => t.category === category);
}
