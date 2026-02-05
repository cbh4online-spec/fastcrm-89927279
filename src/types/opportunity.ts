// Opportunity Types

export type OpportunityStatus = "open" | "won" | "lost";

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  workspace_id: string;
  pipeline_id: string | null;
  name: string;
  position: number;
  color: string;
  probability: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityLead {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
}

export interface OpportunityContact {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
}

export interface OpportunityCompany {
  id: string;
  name: string;
  website?: string | null;
}

// Partial stage info returned from joins
export interface OpportunityStage {
  id: string;
  name: string;
  color: string;
  probability?: number;
  position?: number;
  description?: string | null;
}

export interface Opportunity {
  id: string;
  workspace_id: string;
  title: string;
  value: number;
  currency: string;
  stage_id: string;
  owner_id: string;
  status: OpportunityStatus;
  probability: number;
  source: string | null;
  expected_close_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  // Relations
  lead_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  lead?: OpportunityLead | null;
  contact?: OpportunityContact | null;
  company?: OpportunityCompany | null;
  stage?: OpportunityStage | null;
  // AI fields
  ai_insight: string | null;
  ai_next_action: string | null;
  ai_temperature: string | null;
  ai_analyzed_at: string | null;
  // Commission fields
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_notes: string | null;
}

export interface CreateOpportunityInput {
  title: string;
  lead_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  value?: number;
  currency?: string;
  stage_id: string;
  probability?: number;
  source?: string;
  status?: OpportunityStatus;
  expected_close_date?: string;
  notes?: string;
}

export interface UpdateOpportunityInput extends Partial<Omit<CreateOpportunityInput, "stage_id">> {
  id: string;
  stage_id?: string;
  lost_reason?: string;
  commission_percentage?: number;
  commission_amount?: number;
  commission_notes?: string;
}

// KPI Types
export interface OpportunityKPIs {
  totalValue: number;
  weightedValue: number;
  totalOpen: number;
  totalWon: number;
  totalLost: number;
  conversionRate: number;
  avgDealSize: number;
  avgCloseTime: number;
}

// Pipeline templates for different industries
export interface PipelineTemplate {
  id: string;
  name: string;
  type: string;
  industry: string;
  description: string;
  stages: {
    name: string;
    probability: number;
    color: string;
  }[];
  suggestedFields: {
    name: string;
    type: string;
    description: string;
  }[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: "sales-general",
    name: "Vendas - Geral",
    type: "sales",
    industry: "general",
    description: "Pipeline padrão para vendas B2B",
    stages: [
      { name: "Lead Recebido", probability: 10, color: "#6366f1" },
      { name: "Qualificação", probability: 25, color: "#8b5cf6" },
      { name: "Proposta", probability: 50, color: "#f97316" },
      { name: "Negociação", probability: 75, color: "#eab308" },
      { name: "Fechado Ganho", probability: 100, color: "#22c55e" },
      { name: "Perdido", probability: 0, color: "#ef4444" },
    ],
    suggestedFields: [],
  },
  {
    id: "school-enrollment",
    name: "Escola - Matrículas",
    type: "enrollment",
    industry: "education",
    description: "Pipeline para processo de matrículas",
    stages: [
      { name: "Lead Recebido", probability: 10, color: "#6366f1" },
      { name: "Contacto Feito", probability: 25, color: "#8b5cf6" },
      { name: "Visita/Reunião", probability: 40, color: "#ec4899" },
      { name: "Documentos Enviados", probability: 60, color: "#f97316" },
      { name: "Proposta Enviada", probability: 75, color: "#eab308" },
      { name: "Matrícula Confirmada", probability: 100, color: "#22c55e" },
      { name: "Perdido", probability: 0, color: "#ef4444" },
    ],
    suggestedFields: [
      { name: "Ano Letivo", type: "text", description: "Ano letivo de entrada" },
      { name: "Curso/Turma", type: "text", description: "Curso ou turma pretendida" },
      { name: "Nº Alunos", type: "number", description: "Número de alunos a matricular" },
    ],
  },
  {
    id: "health-appointments",
    name: "Saúde - Consultas",
    type: "appointment",
    industry: "health",
    description: "Pipeline para marcação de consultas e tratamentos",
    stages: [
      { name: "Pedido Recebido", probability: 20, color: "#6366f1" },
      { name: "Triagem", probability: 35, color: "#8b5cf6" },
      { name: "Consulta Marcada", probability: 60, color: "#f97316" },
      { name: "Em Tratamento", probability: 80, color: "#eab308" },
      { name: "Concluído", probability: 100, color: "#22c55e" },
      { name: "Cancelado", probability: 0, color: "#ef4444" },
    ],
    suggestedFields: [
      { name: "Tipo Tratamento", type: "select", description: "Tipo de tratamento/consulta" },
      { name: "Urgência", type: "select", description: "Nível de urgência" },
      { name: "Seguro", type: "text", description: "Informação do seguro" },
    ],
  },
  {
    id: "agency-services",
    name: "Agência - Serviços",
    type: "project",
    industry: "services",
    description: "Pipeline para agências e serviços profissionais",
    stages: [
      { name: "Lead Inbound", probability: 15, color: "#6366f1" },
      { name: "Discovery", probability: 30, color: "#8b5cf6" },
      { name: "Proposta", probability: 50, color: "#f97316" },
      { name: "Negociação", probability: 70, color: "#eab308" },
      { name: "Contrato Fechado", probability: 100, color: "#22c55e" },
      { name: "Perdido", probability: 0, color: "#ef4444" },
    ],
    suggestedFields: [
      { name: "Tipo Serviço", type: "select", description: "Tipo de serviço contratado" },
      { name: "Budget Mensal", type: "currency", description: "Orçamento mensal" },
      { name: "Duração Contrato", type: "text", description: "Duração prevista do contrato" },
    ],
  },
  {
    id: "real-estate",
    name: "Imobiliário",
    type: "real_estate",
    industry: "real_estate",
    description: "Pipeline para vendas imobiliárias",
    stages: [
      { name: "Lead Recebido", probability: 10, color: "#6366f1" },
      { name: "Primeiro Contacto", probability: 20, color: "#8b5cf6" },
      { name: "Visita Agendada", probability: 35, color: "#ec4899" },
      { name: "Visita Realizada", probability: 50, color: "#f97316" },
      { name: "Proposta", probability: 70, color: "#eab308" },
      { name: "Reserva", probability: 85, color: "#14b8a6" },
      { name: "Escritura", probability: 100, color: "#22c55e" },
      { name: "Perdido", probability: 0, color: "#ef4444" },
    ],
    suggestedFields: [
      { name: "Tipo Imóvel", type: "select", description: "Tipo de imóvel" },
      { name: "Localização", type: "text", description: "Zona/localização" },
      { name: "Área (m²)", type: "number", description: "Área do imóvel" },
    ],
  },
];

// Source options
export const OPPORTUNITY_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Indicação" },
  { value: "email", label: "Email" },
  { value: "social", label: "Redes Sociais" },
  { value: "phone", label: "Telefone" },
  { value: "event", label: "Evento" },
  { value: "advertising", label: "Publicidade" },
  { value: "partner", label: "Parceiro" },
  { value: "other", label: "Outro" },
];
