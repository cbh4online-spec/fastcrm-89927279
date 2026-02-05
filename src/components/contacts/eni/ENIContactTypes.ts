// ENI Contact Types and Constants

export type EntityType = 'consumidor_final' | 'eni' | 'empresa';
export type ClientStatus = 'ativo' | 'inativo' | 'sem_compras';
export type ClientTypes = 'consumidores' | 'empresas' | 'ambos';
export type ABCCategory = 'A' | 'B' | 'C' | null;

export interface ENIContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  
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
  
  // Professional Profile (ENI)
  cae_code?: string | null;
  cae_description?: string | null;
  business_area?: string | null;
  fiscal_regime?: string | null;
  activity_start_date?: string | null;
  client_types?: ClientTypes | null;
  
  // Commercial Profile
  client_status?: ClientStatus | null;
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
  
  // AI Fields
  ai_temperature?: string | null;
  ai_insight?: string | null;
  ai_next_action?: string | null;
  ai_next_action_type?: string | null;
  ai_analyzed_at?: string | null;
  contact_score?: number | null;
  conversion_probability?: number | null;
  estimated_value?: number | null;
  ai_contact_type?: string | null;
  
  // Other
  job_title?: string | null;
  company?: string | null;
  company_id?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  workspace_id: string;
  created_by: string;
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
