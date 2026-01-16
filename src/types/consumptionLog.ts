// Types for Consumption Logs (Registo de Consumo)

export type ConsumptionType = 'session' | 'unit' | 'delivery' | 'class' | 'service' | 'other';
export type ConsumptionSource = 'manual' | 'automation' | 'schedule';

export const CONSUMPTION_TYPE_LABELS: Record<ConsumptionType, string> = {
  session: 'Sessão',
  unit: 'Unidade',
  delivery: 'Entrega',
  class: 'Aula',
  service: 'Serviço',
  other: 'Outro',
};

export const CONSUMPTION_SOURCE_LABELS: Record<ConsumptionSource, string> = {
  manual: 'Manual',
  automation: 'Automação',
  schedule: 'Agenda',
};

export interface ConsumptionLog {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  company_id: string | null;
  product_id: string;
  acquired_product_id: string;
  consumption_type: ConsumptionType;
  quantity: number;
  consumption_date: string;
  notes: string | null;
  source: ConsumptionSource;
  created_by: string | null;
  created_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    category: string | null;
  };
  contact?: {
    id: string;
    name: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface CreateConsumptionLogInput {
  contactId?: string;
  companyId?: string;
  productId: string;
  acquiredProductId: string;
  consumptionType?: ConsumptionType;
  quantity?: number;
  consumptionDate?: string;
  notes?: string;
  source?: ConsumptionSource;
}
