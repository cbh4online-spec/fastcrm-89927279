// ENI Contact Types and Constants

export type EntityType = 'consumidor_final' | 'eni' | 'empresa';
export type ClientStatus = 'ativo' | 'inativo' | 'sem_compras';
export type ClientTypes = 'consumidores' | 'empresas' | 'ambos';
export type ABCCategory = 'A' | 'B' | 'C' | null;

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer' | 'churned';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contactado',
  qualified: 'Qualificado',
  unqualified: 'Não Qualificado',
  customer: 'Cliente',
  churned: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  contacted: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  qualified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  unqualified: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  customer: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  churned: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export interface EmailEntry {
  email: string;
  primary: boolean;
  type: 'work' | 'personal' | 'other';
  verified?: boolean;
}

export interface PhoneEntry {
  number: string;
  primary: boolean;
  type: 'mobile' | 'work' | 'home' | 'other';
}

export interface ENIContact {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  emails?: EmailEntry[];
  phones?: PhoneEntry[];
  
  // Entity Type
  entity_type: EntityType;
  
  // Identification
  tax_id?: string | null;
  commercial_name?: string | null;
  has_whatsapp?: boolean;
  whatsapp_number?: string | null;
  
  // Address
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  is_fiscal_address?: boolean;
  timezone?: string | null;
  
  // Professional Profile (ENI)
  cae_code?: string | null;
  cae_description?: string | null;
  business_area?: string | null;
  fiscal_regime?: string | null;
  activity_start_date?: string | null;
  client_types?: ClientTypes | null;
  
  // Commercial Profile
  client_status?: ClientStatus | null;
  lead_status?: LeadStatus | null;
  client_since?: string | null;
  abc_category?: ABCCategory;
  lead_source?: string | null;
  source?: string | null;
  assigned_to?: string | null;
  price_tier_id?: string | null;
  
  // Financial
  payment_conditions?: string | null;
  preferred_payment_method?: string | null;
  credit_limit?: number | null;
  credit_active?: boolean;
  
  // Commercial History
  total_revenue?: number | null;
  sales_2023?: number | null;
  sales_2024?: number | null;
  sales_2025?: number | null;
  sales_2026?: number | null;
  average_ticket?: number | null;
  last_purchase_date?: string | null;
  commercial_history_updated_at?: string | null;
  commercial_history_updated_by?: string | null;
  
  // Scores
  icp_fit_score?: number | null;
  engagement_score?: number | null;
  pare_score?: number | null;
  
  // AI Fields
  ai_temperature?: string | null;
  ai_insight?: string | null;
  ai_next_action?: string | null;
  ai_next_action_type?: string | null;
  ai_analyzed_at?: string | null;
  ai_summary?: string | null;
  ai_tags?: string[] | null;
  ai_pain_points?: Record<string, unknown> | null;
  ai_recommendations?: Record<string, unknown> | null;
  ai_risk_flags?: Record<string, unknown> | null;
  ai_last_enriched_at?: string | null;
  contact_score?: number | null;
  conversion_probability?: number | null;
  estimated_value?: number | null;
  ai_contact_type?: string | null;
  
  // Preferences & Consent
  contact_preferences?: Record<string, boolean> | null;
  marketing_opt_in?: boolean;
  consent_record?: Record<string, unknown> | null;
  
  // Follow-up
  last_email_at?: string | null;
  last_call_at?: string | null;
  next_followup_at?: string | null;
  
  // Extensibility
  custom_fields?: Record<string, unknown> | null;
  segments?: string[] | null;
  
  // Other
  job_title?: string | null;
  company?: string | null;
  company_id?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  
  // Timestamps & Audit
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface ContactDocument {
  id: string;
  contact_id: string;
  workspace_id: string;
  document_type: string;
  file_name: string;
  file_url?: string | null;
  file_size?: number | null;
  notes?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactProduct {
  id: string;
  contact_id: string;
  product_id: string;
  workspace_id: string;
  status: string;
  acquisition_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_price?: number | null;
  total_value?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined product data
  product?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number | null;
    category?: string | null;
  };
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  consumidor_final: 'Consumidor Final',
  eni: 'Empresário em Nome Individual (ENI)',
  empresa: 'Empresa (Lda/SA)',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  sem_compras: 'Não compra há muito',
};

export const CLIENT_TYPES_LABELS: Record<ClientTypes, string> = {
  consumidores: 'Consumidores',
  empresas: 'Empresas',
  ambos: 'Ambos',
};

export const BUSINESS_AREAS = [
  'Formação',
  'Consultoria',
  'Serviços',
  'Saúde',
  'Tecnologia',
  'Comércio',
  'Construção',
  'Indústria',
  'Agricultura',
  'Turismo',
  'Outro',
];

export const FISCAL_REGIMES = [
  'Regime Normal',
  'Regime Simplificado',
  'Regime de Isenção',
  'Regime Forfetário',
];

export const PAYMENT_CONDITIONS = [
  'Pronto Pagamento',
  '15 dias',
  '30 dias',
  '45 dias',
  '60 dias',
  '90 dias',
];

export const PAYMENT_METHODS = [
  'Transferência Bancária',
  'Multibanco',
  'MB Way',
  'Cartão de Crédito',
  'Débito Direto',
  'Cheque',
  'Dinheiro',
];

export const DOCUMENT_TYPES = [
  'Contrato',
  'Proposta',
  'Acordo',
  'Comprovativo',
  'Declaração',
  'Certificado',
  'Outro',
];
