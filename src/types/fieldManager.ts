// Field Manager Types

export type FieldEntityType = 
  | 'contact' 
  | 'company' 
  | 'opportunity' 
  | 'product' 
  | 'financial' 
  | 'proposal' 
  | 'document';

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'boolean' 
  | 'select' 
  | 'multi_select'
  | 'relationship';

export type FieldOrigin = 'system' | 'import' | 'manual' | 'ai';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface FieldPermissions {
  view: WorkspaceRole[];
  edit: WorkspaceRole[];
}

export interface FormattingConfig {
  autoDetect?: boolean;
  normalizePhone?: boolean;
  phonePrefix?: string;
  normalizeCurrency?: boolean;
  currencySymbol?: string;
  normalizeDate?: boolean;
  dateFormat?: string;
  validateNif?: boolean;
  validateEmail?: boolean;
  tagSeparator?: string;
  ai_autofill_enabled?: boolean;
  ai_autofill_type?: 'research' | 'generate' | 'classify';
  ai_autofill_guidance?: string;
}

export interface IndustryLabel {
  industryType: string;
  label: string;
}

export interface ManagedField {
  id: string;
  workspace_id: string;
  entity_type: FieldEntityType;
  name: string;
  label: string;
  internal_name: string;
  field_type: FieldType;
  options: string[];
  required: boolean;
  is_unique: boolean;
  position: number;
  origin: FieldOrigin;
  is_visible: boolean;
  section: string;
  formatting_config: FormattingConfig;
  auto_format: boolean;
  industry_labels: Record<string, string>;
  permissions: FieldPermissions;
  is_system: boolean;
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateManagedFieldInput {
  entity_type: FieldEntityType;
  name: string;
  label: string;
  field_type: FieldType;
  options?: string[];
  required?: boolean;
  is_unique?: boolean;
  position?: number;
  origin?: FieldOrigin;
  is_visible?: boolean;
  section?: string;
  formatting_config?: FormattingConfig;
  auto_format?: boolean;
  industry_labels?: Record<string, string>;
  permissions?: FieldPermissions;
}

export interface UpdateManagedFieldInput {
  id: string;
  name?: string;
  label?: string;
  options?: string[];
  required?: boolean;
  is_unique?: boolean;
  position?: number;
  is_visible?: boolean;
  section?: string;
  formatting_config?: FormattingConfig;
  auto_format?: boolean;
  industry_labels?: Record<string, string>;
  permissions?: FieldPermissions;
  is_archived?: boolean;
}

export interface FieldAuditLog {
  id: string;
  custom_field_id: string;
  workspace_id: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by?: string;
  created_at: string;
}

// Entity labels mapping
export const ENTITY_TYPE_LABELS: Record<FieldEntityType, string> = {
  contact: 'Contactos',
  company: 'Empresas',
  opportunity: 'Oportunidades',
  product: 'Produtos',
  financial: 'Financeiro',
  proposal: 'Propostas',
  document: 'Documentos',
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  currency: 'Moeda',
  date: 'Data',
  email: 'Email',
  phone: 'Telefone',
  url: 'URL',
  boolean: 'Sim/Não',
  select: 'Seleção Única',
  multi_select: 'Seleção Múltipla',
  relationship: 'Relacionamento',
};

export const ORIGIN_LABELS: Record<FieldOrigin, string> = {
  system: 'Sistema',
  import: 'Importação',
  manual: 'Manual',
  ai: 'IA',
};

export const SECTION_OPTIONS = [
  { value: 'identification', label: 'Identificação' },
  { value: 'contact', label: 'Contacto' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'social', label: 'Redes Sociais' },
  { value: 'general', label: 'Geral' },
  { value: 'other', label: 'Outros' },
];

export const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: 'owner', label: 'Proprietário' },
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'member', label: 'Membro' },
  { value: 'viewer', label: 'Visualizador' },
];

// Industry presets for field suggestions
export const INDUSTRY_FIELD_SUGGESTIONS: Record<string, { entity: FieldEntityType; fields: Omit<CreateManagedFieldInput, 'entity_type'>[] }[]> = {
  formacao: [
    {
      entity: 'contact',
      fields: [
        { name: 'student_level', label: 'Nível do Aluno', field_type: 'select', options: ['Iniciante', 'Intermédio', 'Avançado'] },
        { name: 'enrollment_date', label: 'Data de Matrícula', field_type: 'date' },
        { name: 'course_modality', label: 'Modalidade', field_type: 'select', options: ['Presencial', 'Online', 'Híbrido'] },
        { name: 'guardian_name', label: 'Encarregado de Educação', field_type: 'text' },
        { name: 'guardian_phone', label: 'Telefone Encarregado', field_type: 'phone' },
      ],
    },
  ],
  saude: [
    {
      entity: 'contact',
      fields: [
        { name: 'patient_number', label: 'Nº Utente', field_type: 'text', is_unique: true },
        { name: 'birth_date', label: 'Data Nascimento', field_type: 'date' },
        { name: 'blood_type', label: 'Grupo Sanguíneo', field_type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { name: 'allergies', label: 'Alergias', field_type: 'text' },
        { name: 'insurance_number', label: 'Nº Seguro', field_type: 'text' },
        { name: 'referring_doctor', label: 'Médico Referente', field_type: 'text' },
      ],
    },
  ],
  servicos: [
    {
      entity: 'contact',
      fields: [
        { name: 'contract_type', label: 'Tipo de Contrato', field_type: 'select', options: ['Avença', 'Projeto', 'Ocasional'] },
        { name: 'contract_start', label: 'Início Contrato', field_type: 'date' },
        { name: 'contract_end', label: 'Fim Contrato', field_type: 'date' },
        { name: 'billing_frequency', label: 'Frequência Faturação', field_type: 'select', options: ['Mensal', 'Trimestral', 'Anual'] },
      ],
    },
  ],
  agencia: [
    {
      entity: 'contact',
      fields: [
        { name: 'brand_manager', label: 'Brand Manager', field_type: 'text' },
        { name: 'budget_range', label: 'Range de Budget', field_type: 'select', options: ['< 5k', '5k-15k', '15k-50k', '> 50k'] },
        { name: 'preferred_channels', label: 'Canais Preferidos', field_type: 'multi_select', options: ['Meta', 'Google', 'TikTok', 'LinkedIn', 'TV', 'Rádio'] },
      ],
    },
    {
      entity: 'opportunity',
      fields: [
        { name: 'campaign_type', label: 'Tipo de Campanha', field_type: 'select', options: ['Brand Awareness', 'Lead Gen', 'Performance', 'Content'] },
        { name: 'campaign_start', label: 'Início Campanha', field_type: 'date' },
        { name: 'campaign_end', label: 'Fim Campanha', field_type: 'date' },
      ],
    },
  ],
};
