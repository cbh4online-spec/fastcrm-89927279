// Types for Order Audit Log and Workflow System

export interface OrderAuditLog {
  id: string;
  order_note_id: string;
  workspace_id: string;
  action: 'create' | 'update' | 'status_change' | 'approve' | 'reject';
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type WorkflowActionType = 
  | 'send_email'
  | 'create_task'
  | 'notify'
  | 'webhook'
  | 'update_field';

export interface WorkflowAction {
  type: WorkflowActionType;
  config: {
    template_id?: string;
    task_title?: string;
    task_assignee?: string;
    notification_message?: string;
    webhook_url?: string;
    field_name?: string;
    field_value?: string;
  };
}

export interface OrderWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  status_from: string;
  status_to: string;
  is_active: boolean;
  actions: WorkflowAction[];
  conditions: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderWorkflowData {
  workspace_id: string;
  name: string;
  status_from: string;
  status_to: string;
  actions?: WorkflowAction[];
  conditions?: Record<string, unknown>;
}

export interface UpdateOrderWorkflowData {
  name?: string;
  is_active?: boolean;
  actions?: WorkflowAction[];
  conditions?: Record<string, unknown>;
}

// Helper to format audit action for display
export const auditActionLabels: Record<string, { label: string; labelPT: string; color: string }> = {
  create: { label: 'Created', labelPT: 'Criado', color: 'text-green-600' },
  update: { label: 'Updated', labelPT: 'Atualizado', color: 'text-blue-600' },
  status_change: { label: 'Status Changed', labelPT: 'Estado Alterado', color: 'text-purple-600' },
  approve: { label: 'Approved', labelPT: 'Aprovado', color: 'text-emerald-600' },
  reject: { label: 'Rejected', labelPT: 'Rejeitado', color: 'text-red-600' },
};

// Helper to format changed fields for display
export function formatChangedField(field: string): string {
  const fieldLabels: Record<string, string> = {
    status: 'Estado',
    total_net: 'Total Líquido',
    total_gross: 'Total Bruto',
    client_notes: 'Notas do Cliente',
    admin_notes: 'Notas Internas',
    installment_requested: 'Prestações Solicitadas',
    installment_count: 'Nº Prestações',
    billing_address: 'Morada de Faturação',
    shipping_address: 'Morada de Entrega',
  };
  return fieldLabels[field] || field;
}
