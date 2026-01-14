// Template Variable System
// Defines all available variables for templates with their categories and sources

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  category: 'lead' | 'opportunity' | 'company' | 'contact' | 'user' | 'date' | 'custom';
  required?: boolean;
  example: string;
  alternativeFields?: string[]; // For field mapping suggestions
}

// Map of variable keys to compatible alternative fields for mapping
export const variableAlternatives: Record<string, string[]> = {
  '{{lead.name}}': ['{{contact.name}}', '{{company.name}}'],
  '{{lead.email}}': ['{{contact.email}}', '{{company.email}}', '{{user.email}}'],
  '{{lead.phone}}': ['{{contact.phone}}', '{{company.phone}}'],
  '{{lead.first_name}}': ['{{contact.first_name}}', '{{user.first_name}}'],
  '{{contact.name}}': ['{{lead.name}}', '{{company.name}}'],
  '{{contact.email}}': ['{{lead.email}}', '{{company.email}}', '{{user.email}}'],
  '{{company.name}}': ['{{lead.name}}', '{{contact.company}}'],
  '{{company.email}}': ['{{lead.email}}', '{{contact.email}}'],
  '{{opportunity.title}}': ['{{lead.name}}'],
};

export interface VariableCategory {
  id: string;
  label: string;
  icon: string;
  variables: TemplateVariable[];
}

// Lead variables
const leadVariables: TemplateVariable[] = [
  { key: '{{lead.name}}', label: 'Nome completo', description: 'Nome completo do lead', category: 'lead', example: 'João Silva' },
  { key: '{{lead.first_name}}', label: 'Primeiro nome', description: 'Primeiro nome do lead', category: 'lead', example: 'João' },
  { key: '{{lead.last_name}}', label: 'Último nome', description: 'Último nome do lead', category: 'lead', example: 'Silva' },
  { key: '{{lead.email}}', label: 'Email', description: 'Email do lead', category: 'lead', example: 'joao@exemplo.com' },
  { key: '{{lead.phone}}', label: 'Telefone', description: 'Número de telefone', category: 'lead', example: '+351 912 345 678' },
  { key: '{{lead.status}}', label: 'Estado', description: 'Estado atual do lead', category: 'lead', example: 'Novo' },
  { key: '{{lead.source}}', label: 'Origem', description: 'Origem do lead', category: 'lead', example: 'Website' },
  { key: '{{lead.created_at}}', label: 'Data de criação', description: 'Data de criação do lead', category: 'lead', example: '15/01/2025' },
];

// Opportunity variables
const opportunityVariables: TemplateVariable[] = [
  { key: '{{opportunity.title}}', label: 'Título', description: 'Título da oportunidade', category: 'opportunity', example: 'Proposta Comercial' },
  { key: '{{opportunity.value}}', label: 'Valor', description: 'Valor da oportunidade', category: 'opportunity', example: '5.000€' },
  { key: '{{opportunity.stage}}', label: 'Etapa', description: 'Etapa atual do pipeline', category: 'opportunity', example: 'Negociação' },
  { key: '{{opportunity.expected_close_date}}', label: 'Data fecho esperado', description: 'Data estimada de fecho', category: 'opportunity', example: '28/02/2025' },
  { key: '{{opportunity.notes}}', label: 'Notas', description: 'Notas da oportunidade', category: 'opportunity', example: 'Cliente interessado...' },
  { key: '{{opportunity.status}}', label: 'Estado', description: 'Estado da oportunidade', category: 'opportunity', example: 'open' },
];

// Company variables
const companyVariables: TemplateVariable[] = [
  { key: '{{company.name}}', label: 'Nome', description: 'Nome da empresa', category: 'company', example: 'Empresa ABC' },
  { key: '{{company.email}}', label: 'Email', description: 'Email da empresa', category: 'company', example: 'info@empresaabc.com' },
  { key: '{{company.phone}}', label: 'Telefone', description: 'Telefone da empresa', category: 'company', example: '+351 21 123 4567' },
  { key: '{{company.website}}', label: 'Website', description: 'Website da empresa', category: 'company', example: 'www.empresaabc.com' },
  { key: '{{company.industry}}', label: 'Indústria', description: 'Setor de atividade', category: 'company', example: 'Tecnologia' },
  { key: '{{company.size}}', label: 'Tamanho', description: 'Tamanho da empresa', category: 'company', example: '50-100 funcionários' },
  { key: '{{company.address}}', label: 'Morada', description: 'Endereço da empresa', category: 'company', example: 'Rua das Flores, 123, Lisboa' },
];

// Contact variables
const contactVariables: TemplateVariable[] = [
  { key: '{{contact.name}}', label: 'Nome', description: 'Nome do contacto', category: 'contact', example: 'Maria Costa' },
  { key: '{{contact.first_name}}', label: 'Primeiro nome', description: 'Primeiro nome do contacto', category: 'contact', example: 'Maria' },
  { key: '{{contact.email}}', label: 'Email', description: 'Email do contacto', category: 'contact', example: 'maria@exemplo.com' },
  { key: '{{contact.phone}}', label: 'Telefone', description: 'Telefone do contacto', category: 'contact', example: '+351 913 456 789' },
  { key: '{{contact.job_title}}', label: 'Cargo', description: 'Cargo/Função', category: 'contact', example: 'Diretora Comercial' },
  { key: '{{contact.company}}', label: 'Empresa', description: 'Empresa do contacto', category: 'contact', example: 'Empresa XYZ' },
];

// User variables (current user)
const userVariables: TemplateVariable[] = [
  { key: '{{user.name}}', label: 'Teu nome', description: 'O teu nome completo', category: 'user', example: 'Ana Santos' },
  { key: '{{user.first_name}}', label: 'Teu primeiro nome', description: 'O teu primeiro nome', category: 'user', example: 'Ana' },
  { key: '{{user.email}}', label: 'Teu email', description: 'O teu email', category: 'user', example: 'ana@empresa.com' },
];

// Date variables
const dateVariables: TemplateVariable[] = [
  { key: '{{date.today}}', label: 'Hoje', description: 'Data de hoje', category: 'date', example: new Date().toLocaleDateString('pt-PT') },
  { key: '{{date.tomorrow}}', label: 'Amanhã', description: 'Data de amanhã', category: 'date', example: new Date(Date.now() + 86400000).toLocaleDateString('pt-PT') },
  { key: '{{date.next_week}}', label: 'Próxima semana', description: 'Daqui a uma semana', category: 'date', example: new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-PT') },
  { key: '{{date.next_month}}', label: 'Próximo mês', description: 'Daqui a um mês', category: 'date', example: new Date(Date.now() + 30 * 86400000).toLocaleDateString('pt-PT') },
  { key: '{{date.current_time}}', label: 'Hora atual', description: 'Hora atual', category: 'date', example: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) },
];

// All variables grouped by category
export const variableCategories: VariableCategory[] = [
  { id: 'lead', label: 'Lead', icon: 'User', variables: leadVariables },
  { id: 'opportunity', label: 'Oportunidade', icon: 'Target', variables: opportunityVariables },
  { id: 'company', label: 'Empresa', icon: 'Building2', variables: companyVariables },
  { id: 'contact', label: 'Contacto', icon: 'UserCircle', variables: contactVariables },
  { id: 'user', label: 'Utilizador', icon: 'UserCheck', variables: userVariables },
  { id: 'date', label: 'Data/Hora', icon: 'Calendar', variables: dateVariables },
];

// Flat list of all variables
export const allVariables: TemplateVariable[] = [
  ...leadVariables,
  ...opportunityVariables,
  ...companyVariables,
  ...contactVariables,
  ...userVariables,
  ...dateVariables,
];

// Extract variable keys from content
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{[^}]+\}\}/g) || [];
  return [...new Set(matches)];
}

// Check if a variable is valid
export function isValidVariable(variable: string): boolean {
  return allVariables.some(v => v.key === variable);
}

// Get variable info by key
export function getVariableInfo(key: string): TemplateVariable | undefined {
  return allVariables.find(v => v.key === key);
}

// Parse entity data to get first name
function getFirstName(name: string | null | undefined): string {
  if (!name) return '';
  return name.split(' ')[0];
}

// Parse entity data to get last name
function getLastName(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

// Format currency value
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

// Format date
function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-PT');
}

// Variable value resolver
export interface VariableContext {
  lead?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    source?: string;
    created_at?: string;
  } | null;
  opportunity?: {
    id?: string;
    title?: string;
    value?: number;
    stage?: string;
    expected_close_date?: string;
    notes?: string;
    status?: string;
  } | null;
  company?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    industry?: string;
    size?: string;
    address?: string;
  } | null;
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    job_title?: string;
    company?: string;
  } | null;
  user?: {
    id?: string;
    full_name?: string;
    email?: string;
  } | null;
  customFields?: Record<string, any>;
}

// Resolve a single variable
export function resolveVariable(variable: string, context: VariableContext): string | null {
  const key = variable.replace(/\{\{|\}\}/g, '');
  const [entity, field] = key.split('.');
  
  switch (entity) {
    case 'lead':
      if (!context.lead) return null;
      switch (field) {
        case 'name': return context.lead.name || null;
        case 'first_name': return getFirstName(context.lead.name);
        case 'last_name': return getLastName(context.lead.name);
        case 'email': return context.lead.email || null;
        case 'phone': return context.lead.phone || null;
        case 'status': return context.lead.status || null;
        case 'source': return context.lead.source || null;
        case 'created_at': return formatDate(context.lead.created_at);
        default: return null;
      }
    
    case 'opportunity':
      if (!context.opportunity) return null;
      switch (field) {
        case 'title': return context.opportunity.title || null;
        case 'value': return formatCurrency(context.opportunity.value);
        case 'stage': return context.opportunity.stage || null;
        case 'expected_close_date': return formatDate(context.opportunity.expected_close_date);
        case 'notes': return context.opportunity.notes || null;
        case 'status': return context.opportunity.status || null;
        default: return null;
      }
    
    case 'company':
      if (!context.company) return null;
      switch (field) {
        case 'name': return context.company.name || null;
        case 'email': return context.company.email || null;
        case 'phone': return context.company.phone || null;
        case 'website': return context.company.website || null;
        case 'industry': return context.company.industry || null;
        case 'size': return context.company.size || null;
        case 'address': return context.company.address || null;
        default: return null;
      }
    
    case 'contact':
      if (!context.contact) return null;
      switch (field) {
        case 'name': return context.contact.name || null;
        case 'first_name': return getFirstName(context.contact.name);
        case 'email': return context.contact.email || null;
        case 'phone': return context.contact.phone || null;
        case 'job_title': return context.contact.job_title || null;
        case 'company': return context.contact.company || null;
        default: return null;
      }
    
    case 'user':
      if (!context.user) return null;
      switch (field) {
        case 'name': return context.user.full_name || null;
        case 'first_name': return getFirstName(context.user.full_name);
        case 'email': return context.user.email || null;
        default: return null;
      }
    
    case 'date':
      const now = new Date();
      switch (field) {
        case 'today': return now.toLocaleDateString('pt-PT');
        case 'tomorrow': return new Date(now.getTime() + 86400000).toLocaleDateString('pt-PT');
        case 'next_week': return new Date(now.getTime() + 7 * 86400000).toLocaleDateString('pt-PT');
        case 'next_month': return new Date(now.getTime() + 30 * 86400000).toLocaleDateString('pt-PT');
        case 'current_time': return now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        default: return null;
      }
    
    default:
      return null;
  }
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  missingVariables: string[];
  invalidVariables: string[];
  resolvedVariables: Record<string, string>;
  unresolvedVariables: string[];
}

// Validate template content against context
export function validateTemplate(content: string, context: VariableContext): ValidationResult {
  const variables = extractVariables(content);
  const missingVariables: string[] = [];
  const invalidVariables: string[] = [];
  const resolvedVariables: Record<string, string> = {};
  const unresolvedVariables: string[] = [];
  
  for (const variable of variables) {
    if (!isValidVariable(variable)) {
      invalidVariables.push(variable);
      continue;
    }
    
    const value = resolveVariable(variable, context);
    if (value !== null && value !== '') {
      resolvedVariables[variable] = value;
    } else {
      unresolvedVariables.push(variable);
      // Check if the entity is missing entirely
      const [entity] = variable.replace(/\{\{|\}\}/g, '').split('.');
      if (
        (entity === 'lead' && !context.lead) ||
        (entity === 'opportunity' && !context.opportunity) ||
        (entity === 'company' && !context.company) ||
        (entity === 'contact' && !context.contact) ||
        (entity === 'user' && !context.user)
      ) {
        missingVariables.push(variable);
      }
    }
  }
  
  return {
    isValid: invalidVariables.length === 0 && missingVariables.length === 0,
    missingVariables,
    invalidVariables,
    resolvedVariables,
    unresolvedVariables,
  };
}

// Render template with context
export function renderTemplate(content: string, context: VariableContext): string {
  let rendered = content;
  const variables = extractVariables(content);
  
  for (const variable of variables) {
    const value = resolveVariable(variable, context);
    if (value !== null) {
      rendered = rendered.replace(new RegExp(escapeRegex(variable), 'g'), value);
    }
  }
  
  return rendered;
}

// Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get example data for preview
export function getExampleContext(): VariableContext {
  return {
    lead: {
      id: 'example-lead-id',
      name: 'João Silva',
      email: 'joao@exemplo.com',
      phone: '+351 912 345 678',
      status: 'Novo',
      source: 'Website',
      created_at: new Date().toISOString(),
    },
    opportunity: {
      id: 'example-opp-id',
      title: 'Proposta Comercial',
      value: 5000,
      stage: 'Negociação',
      expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: 'Cliente muito interessado no produto.',
      status: 'open',
    },
    company: {
      id: 'example-company-id',
      name: 'Empresa ABC',
      email: 'info@empresaabc.com',
      phone: '+351 21 123 4567',
      website: 'www.empresaabc.com',
      industry: 'Tecnologia',
      size: '50-100 funcionários',
      address: 'Rua das Flores, 123, Lisboa',
    },
    contact: {
      id: 'example-contact-id',
      name: 'Maria Costa',
      email: 'maria@empresa.com',
      phone: '+351 913 456 789',
      job_title: 'Diretora Comercial',
      company: 'Empresa XYZ',
    },
    user: {
      id: 'example-user-id',
      full_name: 'Ana Santos',
      email: 'ana@tuaempresa.com',
    },
  };
}
