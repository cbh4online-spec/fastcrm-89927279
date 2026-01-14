export type FormFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  defaultValue?: string | number | boolean | string[];
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings?: {
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  number: 'Número',
  currency: 'Moeda',
  date: 'Data',
  datetime: 'Data e hora',
  boolean: 'Sim/Não',
  select: 'Seleção única',
  multiselect: 'Seleção múltipla',
  email: 'Email',
  phone: 'Telefone',
  url: 'URL',
};

export const FIELD_TYPE_ICONS: Record<FormFieldType, string> = {
  text: 'Type',
  textarea: 'AlignLeft',
  number: 'Hash',
  currency: 'DollarSign',
  date: 'Calendar',
  datetime: 'Clock',
  boolean: 'ToggleLeft',
  select: 'ChevronDown',
  multiselect: 'CheckSquare',
  email: 'Mail',
  phone: 'Phone',
  url: 'Link',
};
