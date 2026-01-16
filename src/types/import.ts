// Smart Import Types

export type IndustryType = 
  | 'default'
  | 'formacao'
  | 'saude'
  | 'servicos'
  | 'agencia'
  | 'custom';

export type ImportEntityType = 'contacts' | 'companies' | 'leads' | 'products' | 'opportunities';

export type DetectedDataType = 
  | 'text'
  | 'email'
  | 'phone'
  | 'currency'
  | 'date'
  | 'nif'
  | 'postal_code'
  | 'url'
  | 'boolean'
  | 'number'
  | 'tags';

export type ConflictPolicy = 'fill_empty' | 'always_update' | 'ask';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface IndustryLabels {
  // Entity labels (plural forms for menus/lists)
  contacts?: string;
  companies?: string;
  leads?: string;
  products?: string;
  opportunities?: string;
  
  // Field labels customization
  fieldLabels?: Record<string, Record<string, string>>;
}

export const INDUSTRY_PRESETS: Record<IndustryType, IndustryLabels> = {
  default: {
    contacts: 'Contactos',
    companies: 'Empresas',
    leads: 'Leads',
    products: 'Produtos',
    opportunities: 'Oportunidades',
  },
  formacao: {
    contacts: 'Alunos',
    companies: 'Instituições',
    leads: 'Candidatos',
    products: 'Cursos',
    opportunities: 'Matrículas',
    fieldLabels: {
      contacts: {
        job_title: 'Formação',
        company: 'Instituição de Origem',
      },
      products: {
        price: 'Propina',
        category: 'Área de Formação',
      },
    },
  },
  saude: {
    contacts: 'Pacientes',
    companies: 'Clínicas',
    leads: 'Consultas',
    products: 'Tratamentos',
    opportunities: 'Procedimentos',
    fieldLabels: {
      contacts: {
        job_title: 'Profissão',
        company: 'Médico Referente',
        notes: 'Historial Clínico',
      },
      products: {
        description: 'Protocolo',
        category: 'Especialidade',
      },
    },
  },
  servicos: {
    contacts: 'Clientes',
    companies: 'Empresas',
    leads: 'Potenciais Clientes',
    products: 'Serviços',
    opportunities: 'Projetos',
  },
  agencia: {
    contacts: 'Clientes',
    companies: 'Marcas',
    leads: 'Briefings',
    products: 'Campanhas',
    opportunities: 'Projetos',
    fieldLabels: {
      contacts: {
        job_title: 'Cargo no Cliente',
      },
      products: {
        category: 'Tipo de Campanha',
      },
    },
  },
  custom: {
    contacts: 'Contactos',
    companies: 'Empresas',
    leads: 'Leads',
    products: 'Produtos',
    opportunities: 'Oportunidades',
  },
};

export interface ColumnDetection {
  header: string;
  sampleValues: string[];
  detectedType: DetectedDataType;
  confidence: ConfidenceLevel;
  suggestedField?: string;
  suggestedTransformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'normalize_phone' | 'normalize_postal' | 'normalize_currency' | 'normalize_date' | 'normalize_tags' | 'normalize_nif' | 'custom';
  description: string;
  example?: {
    before: string;
    after: string;
  };
  enabled: boolean;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null; // null = ignore
  targetEntityType?: ImportEntityType;
  isNewField: boolean;
  newFieldConfig?: NewFieldConfig;
  detectedType: DetectedDataType;
  manualType?: DetectedDataType;
  transformations: DataTransformation[];
  applyTransformations: boolean;
}

export interface NewFieldConfig {
  name: string;
  label: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select';
  entityType: ImportEntityType;
  options?: string[]; // For select type
  required?: boolean;
}

export interface ConflictResolution {
  field: string;
  existingValue: string;
  newValue: string;
  resolution: 'keep_existing' | 'use_new' | 'merge';
}

export interface ImportConfig {
  industryType: IndustryType;
  conflictPolicy: ConflictPolicy;
  criticalFields: string[];
  columnMappings: ColumnMapping[];
  createNewFields: boolean;
}

export interface ImportProgress {
  current: number;
  total: number;
  status: 'processing' | 'resolving_conflicts' | 'complete' | 'error';
  currentRow?: Record<string, unknown>;
  conflicts?: ConflictResolution[];
}

export interface ImportResult {
  success: number;
  errors: number;
  skipped: number;
  duplicatesFound: number;
  duplicatesUpdated: number;
  fieldsCreated: string[];
  errorDetails: Array<{
    row: number;
    field?: string;
    error: string;
  }>;
}

// Field definitions for each entity type
export interface FieldDefinition {
  field: string;
  label: string;
  type: DetectedDataType;
  required?: boolean;
  group?: string;
}

export const ENTITY_FIELDS: Record<ImportEntityType, FieldDefinition[]> = {
  contacts: [
    { field: 'name', label: 'Nome', type: 'text', required: true, group: 'basic' },
    { field: 'email', label: 'Email', type: 'email', group: 'basic' },
    { field: 'phone', label: 'Telefone', type: 'phone', group: 'basic' },
    { field: 'company', label: 'Empresa', type: 'text', group: 'work' },
    { field: 'job_title', label: 'Cargo', type: 'text', group: 'work' },
    { field: 'tax_id', label: 'NIF', type: 'nif', group: 'fiscal' },
    { field: 'address', label: 'Morada', type: 'text', group: 'address' },
    { field: 'city', label: 'Cidade', type: 'text', group: 'address' },
    { field: 'postal_code', label: 'Código Postal', type: 'postal_code', group: 'address' },
    { field: 'country', label: 'País', type: 'text', group: 'address' },
    { field: 'source', label: 'Origem', type: 'text', group: 'crm' },
    { field: 'tags', label: 'Tags', type: 'tags', group: 'crm' },
    { field: 'notes', label: 'Notas', type: 'text', group: 'other' },
    { field: 'linkedin_url', label: 'LinkedIn', type: 'url', group: 'social' },
    { field: 'facebook_url', label: 'Facebook', type: 'url', group: 'social' },
    { field: 'instagram_url', label: 'Instagram', type: 'url', group: 'social' },
    { field: 'whatsapp_number', label: 'WhatsApp', type: 'phone', group: 'contact' },
    { field: 'entity_type', label: 'Tipo de Entidade', type: 'text', group: 'fiscal' },
    { field: 'commercial_name', label: 'Nome Comercial', type: 'text', group: 'fiscal' },
    { field: 'cae_code', label: 'Código CAE', type: 'text', group: 'fiscal' },
    { field: 'business_area', label: 'Área de Negócio', type: 'text', group: 'work' },
    { field: 'fiscal_regime', label: 'Regime Fiscal', type: 'text', group: 'fiscal' },
    { field: 'client_status', label: 'Estado Cliente', type: 'text', group: 'crm' },
    { field: 'payment_conditions', label: 'Condições Pagamento', type: 'text', group: 'financial' },
    { field: 'preferred_payment_method', label: 'Método Pagamento', type: 'text', group: 'financial' },
    { field: 'credit_limit', label: 'Limite Crédito', type: 'currency', group: 'financial' },
    { field: 'total_revenue', label: 'Receita Total', type: 'currency', group: 'commercial' },
    { field: 'sales_2023', label: 'Vendas 2023', type: 'currency', group: 'commercial' },
    { field: 'sales_2024', label: 'Vendas 2024', type: 'currency', group: 'commercial' },
    { field: 'sales_2025', label: 'Vendas 2025', type: 'currency', group: 'commercial' },
  ],
  companies: [
    { field: 'name', label: 'Nome', type: 'text', required: true, group: 'basic' },
    { field: 'email', label: 'Email', type: 'email', group: 'basic' },
    { field: 'phone', label: 'Telefone', type: 'phone', group: 'basic' },
    { field: 'fax', label: 'Fax', type: 'phone', group: 'basic' },
    { field: 'website', label: 'Website', type: 'url', group: 'basic' },
    { field: 'tax_id', label: 'NIF', type: 'nif', group: 'fiscal' },
    { field: 'address', label: 'Morada', type: 'text', group: 'address' },
    { field: 'postal_code', label: 'Código Postal', type: 'postal_code', group: 'address' },
    { field: 'city', label: 'Cidade', type: 'text', group: 'address' },
    { field: 'parish', label: 'Freguesia', type: 'text', group: 'address' },
    { field: 'county', label: 'Concelho', type: 'text', group: 'address' },
    { field: 'region', label: 'Região', type: 'text', group: 'address' },
    { field: 'industry', label: 'Indústria', type: 'text', group: 'info' },
    { field: 'size', label: 'Dimensão', type: 'text', group: 'info' },
    { field: 'employee_count', label: 'Nº Funcionários', type: 'number', group: 'info' },
    { field: 'annual_revenue', label: 'Receita Anual', type: 'currency', group: 'financial' },
    { field: 'founding_date', label: 'Data Fundação', type: 'date', group: 'info' },
    { field: 'legal_nature', label: 'Natureza Jurídica', type: 'text', group: 'fiscal' },
    { field: 'capital_social', label: 'Capital Social', type: 'text', group: 'fiscal' },
    { field: 'cae_codes', label: 'Códigos CAE', type: 'tags', group: 'fiscal' },
    { field: 'cae_description', label: 'Descrição CAE', type: 'text', group: 'fiscal' },
    { field: 'source', label: 'Origem', type: 'text', group: 'crm' },
    { field: 'tags', label: 'Tags', type: 'tags', group: 'crm' },
    { field: 'notes', label: 'Notas', type: 'text', group: 'other' },
    { field: 'linkedin_url', label: 'LinkedIn', type: 'url', group: 'social' },
    { field: 'facebook_url', label: 'Facebook', type: 'url', group: 'social' },
    { field: 'instagram_url', label: 'Instagram', type: 'url', group: 'social' },
  ],
  leads: [
    { field: 'name', label: 'Nome', type: 'text', required: true, group: 'basic' },
    { field: 'email', label: 'Email', type: 'email', group: 'basic' },
    { field: 'phone', label: 'Telefone', type: 'phone', group: 'basic' },
    { field: 'company', label: 'Empresa', type: 'text', group: 'work' },
    { field: 'source', label: 'Origem', type: 'text', group: 'crm' },
    { field: 'status', label: 'Estado', type: 'text', group: 'crm' },
    { field: 'tags', label: 'Tags', type: 'tags', group: 'crm' },
    { field: 'notes', label: 'Notas', type: 'text', group: 'other' },
    { field: 'linkedin_url', label: 'LinkedIn', type: 'url', group: 'social' },
    { field: 'facebook_url', label: 'Facebook', type: 'url', group: 'social' },
    { field: 'instagram_url', label: 'Instagram', type: 'url', group: 'social' },
  ],
  products: [
    { field: 'name', label: 'Nome', type: 'text', required: true, group: 'basic' },
    { field: 'description', label: 'Descrição', type: 'text', group: 'basic' },
    { field: 'price', label: 'Preço', type: 'currency', group: 'pricing' },
    { field: 'sku', label: 'SKU', type: 'text', group: 'info' },
    { field: 'category', label: 'Categoria', type: 'text', group: 'info' },
    { field: 'unit', label: 'Unidade', type: 'text', group: 'info' },
    { field: 'tax_rate', label: 'Taxa IVA', type: 'number', group: 'pricing' },
    { field: 'cost', label: 'Custo', type: 'currency', group: 'pricing' },
  ],
  opportunities: [
    { field: 'name', label: 'Nome', type: 'text', required: true, group: 'basic' },
    { field: 'value', label: 'Valor', type: 'currency', group: 'basic' },
    { field: 'stage', label: 'Fase', type: 'text', group: 'status' },
    { field: 'probability', label: 'Probabilidade', type: 'number', group: 'status' },
    { field: 'expected_close_date', label: 'Data Fecho Prevista', type: 'date', group: 'dates' },
    { field: 'source', label: 'Origem', type: 'text', group: 'crm' },
    { field: 'notes', label: 'Notas', type: 'text', group: 'other' },
  ],
};
