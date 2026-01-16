// Form Builder Types

export type FormType = 'lead' | 'contact' | 'opportunity' | 'custom';
export type FormStatus = 'draft' | 'active' | 'archived';
export type TargetEntity = 'contact' | 'company' | 'lead' | 'opportunity';
export type FieldWidth = 'full' | 'half' | 'third';

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'currency'
  | 'date' 
  | 'datetime'
  | 'textarea' 
  | 'select' 
  | 'multi_select'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'hidden'
  | 'heading'
  | 'paragraph';

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  position: number;
  isCollapsible?: boolean;
}

export interface ConditionalRule {
  id: string;
  fieldKey: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'empty' | 'greater' | 'less';
  value: string;
  action: 'show' | 'hide' | 'require' | 'change_label';
  targetFieldKey: string;
  newValue?: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'nif' | 'min_length' | 'max_length' | 'pattern' | 'min' | 'max';
  value?: string | number;
  message?: string;
}

export interface FormattingConfig {
  autoFormat?: boolean;
  normalizePhone?: boolean;
  phonePrefix?: string;
  validateNif?: boolean;
  validateEmail?: boolean;
}

export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isVisible: boolean;
  section: string;
  position: number;
  options?: string[];
  validationRules?: ValidationRule[];
  formattingConfig?: FormattingConfig;
  conditionalVisibility?: ConditionalRule;
  width: FieldWidth;
  defaultValue?: string;
  customFieldId?: string;
}

export interface FormSchema {
  sections: FormSection[];
  fields: FormFieldConfig[];
  settings: {
    showProgressBar?: boolean;
    submitButtonText?: string;
    layout?: 'single' | 'multi-step';
  };
}

export interface SubmissionActions {
  createContact: boolean;
  createOpportunity: boolean;
  createLead: boolean;
  tags: string[];
  assignTo?: string;
  redirectUrl?: string;
  successMessage?: string;
  webhooks: string[];
  sendEmail?: {
    enabled: boolean;
    templateId?: string;
  };
}

export interface FormStyling {
  theme: 'default' | 'minimal' | 'modern' | 'custom';
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface FormDefinition {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  slug?: string;
  form_type: FormType;
  target_entity: TargetEntity;
  industry_type: string;
  status: FormStatus;
  schema: FormSchema;
  conditional_logic: ConditionalRule[];
  submission_actions: SubmissionActions;
  success_message: string;
  styling: FormStyling;
  is_public: boolean;
  submissions_count: number;
  last_submission_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  form_id: string;
  custom_field_id?: string;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  is_visible: boolean;
  section: string;
  position: number;
  options?: string[];
  validation_rules: ValidationRule[];
  formatting_config: FormattingConfig;
  conditional_visibility?: ConditionalRule;
  width: FieldWidth;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  workspace_id: string;
  raw_data: Record<string, unknown>;
  processed_data?: Record<string, unknown>;
  created_contact_id?: string;
  created_company_id?: string;
  created_opportunity_id?: string;
  created_lead_id?: string;
  ip_address?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_errors?: Array<{ field: string; error: string }>;
  ai_summary?: string;
  ai_score?: number;
  submitted_at: string;
  processed_at?: string;
}

export interface FormTemplate {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  form_type: FormType;
  industry_type?: string;
  schema: FormSchema;
  is_system: boolean;
  is_public: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
}

export interface CreateFormInput {
  name: string;
  description?: string;
  form_type: FormType;
  target_entity: TargetEntity;
  industry_type?: string;
  schema?: FormSchema;
  template_id?: string;
}

export interface UpdateFormInput {
  id: string;
  name?: string;
  description?: string;
  slug?: string;
  status?: FormStatus;
  schema?: FormSchema;
  conditional_logic?: ConditionalRule[];
  submission_actions?: SubmissionActions;
  success_message?: string;
  styling?: FormStyling;
  is_public?: boolean;
}

// UI Labels
export const FORM_TYPE_LABELS: Record<FormType, string> = {
  lead: 'Lead / Pedido de Contacto',
  contact: 'Contacto',
  opportunity: 'Oportunidade',
  custom: 'Personalizado',
};

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
};

export const TARGET_ENTITY_LABELS: Record<TargetEntity, string> = {
  contact: 'Contacto',
  company: 'Empresa',
  lead: 'Lead',
  opportunity: 'Oportunidade',
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto',
  email: 'Email',
  phone: 'Telefone',
  number: 'Número',
  currency: 'Moeda',
  date: 'Data',
  datetime: 'Data e Hora',
  textarea: 'Texto Longo',
  select: 'Seleção',
  multi_select: 'Seleção Múltipla',
  checkbox: 'Checkbox',
  radio: 'Opções',
  file: 'Ficheiro',
  hidden: 'Oculto',
  heading: 'Título',
  paragraph: 'Parágrafo',
};

export const INDUSTRY_TEMPLATES: Record<string, { name: string; description: string }> = {
  default: { name: 'Padrão', description: 'Formulário genérico' },
  formacao: { name: 'Formação', description: 'Inscrições e matrículas' },
  saude: { name: 'Saúde', description: 'Consultas e pacientes' },
  servicos: { name: 'Serviços', description: 'Orçamentos e projetos' },
  agencia: { name: 'Agência', description: 'Briefings e campanhas' },
};

// Default empty form schema
export const DEFAULT_FORM_SCHEMA: FormSchema = {
  sections: [
    { id: 'main', title: 'Informações', position: 0 }
  ],
  fields: [],
  settings: {
    showProgressBar: false,
    submitButtonText: 'Enviar',
    layout: 'single',
  },
};

// System fields available for forms
export const SYSTEM_FIELDS: Omit<FormFieldConfig, 'id' | 'position'>[] = [
  { key: 'name', label: 'Nome', type: 'text', isRequired: true, isVisible: true, section: 'main', width: 'full' },
  { key: 'email', label: 'Email', type: 'email', isRequired: false, isVisible: true, section: 'main', width: 'half' },
  { key: 'phone', label: 'Telefone', type: 'phone', isRequired: false, isVisible: true, section: 'main', width: 'half' },
  { key: 'company', label: 'Empresa', type: 'text', isRequired: false, isVisible: true, section: 'main', width: 'full' },
  { key: 'message', label: 'Mensagem', type: 'textarea', isRequired: false, isVisible: true, section: 'main', width: 'full' },
  { key: 'source', label: 'Como conheceu', type: 'select', isRequired: false, isVisible: true, section: 'main', width: 'full', options: ['Website', 'Google', 'Redes Sociais', 'Indicação', 'Outro'] },
];
