// Payment Conditions Options
export const PAYMENT_CONDITIONS = [
  { value: 'pronto_pagamento', label: 'Pronto Pagamento' },
  { value: '15_dias', label: '15 dias' },
  { value: '30_dias', label: '30 dias' },
  { value: '45_dias', label: '45 dias' },
  { value: '60_dias', label: '60 dias' },
  { value: '90_dias', label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
] as const;

// Validity Days Options
export const VALIDITY_DAYS_OPTIONS = [7, 15, 30, 45, 60, 90] as const;

// Client Type Options
export const CLIENT_TYPE_OPTIONS = [
  { value: 'contact', label: 'Pessoa Singular', description: 'Contacto individual' },
  { value: 'company', label: 'Empresa', description: 'Entidade empresarial' },
] as const;

export type PaymentConditionValue = typeof PAYMENT_CONDITIONS[number]['value'];
export type ClientType = 'contact' | 'company';
