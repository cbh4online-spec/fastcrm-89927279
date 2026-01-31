// Types for Order Notes Module (Módulo de Nota de Encomenda Profissional)

import type { ClientUser } from './client-user';

export type OrderNoteStatus = 
  | 'draft'
  | 'submitted' 
  | 'awaiting_approval'
  | 'approved' 
  | 'rejected'
  | 'in_preparation' 
  | 'invoiced' 
  | 'cancelled';

export type ProductAttributeType = 
  | 'function' 
  | 'pathology' 
  | 'indication' 
  | 'protocol';

export interface OrderNote {
  id: string;
  workspace_id: string;
  client_user_id: string;
  order_number: string;
  status: OrderNoteStatus;
  total_net: number;
  total_vat: number;
  total_gross: number;
  currency: string;
  installment_requested: boolean;
  installment_count: number;
  installment_notes: string | null;
  client_notes: string | null;
  admin_notes: string | null;
  billing_address: AddressData;
  shipping_address: AddressData;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  client_user?: ClientUser;
  items?: OrderNoteItem[];
}

export interface OrderNoteItem {
  id: string;
  order_note_id: string;
  workspace_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  vat_amount: number;
  line_total_net: number;
  line_total_gross: number;
  position: number;
  notes: string | null;
  created_at: string;
}

export interface AddressData {
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  additional_info?: string;
}

export interface CreateOrderNoteData {
  workspace_id: string;
  client_user_id: string;
  client_notes?: string;
  billing_address?: AddressData;
  shipping_address?: AddressData;
  installment_requested?: boolean;
  installment_count?: number;
  installment_notes?: string;
}

export interface UpdateOrderNoteData {
  status?: OrderNoteStatus;
  client_notes?: string;
  admin_notes?: string;
  billing_address?: AddressData;
  shipping_address?: AddressData;
  installment_requested?: boolean;
  installment_count?: number;
  installment_notes?: string;
  rejection_reason?: string;
}

export interface CreateOrderNoteItemData {
  order_note_id: string;
  workspace_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  quantity: number;
  unit_price_net: number;
  vat_rate?: number;
  position?: number;
  notes?: string;
}

export interface UpdateOrderNoteItemData {
  quantity?: number;
  notes?: string;
}

// Cart types for client portal
export interface CartItem {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  line_total_net: number;
  vat_amount: number;
  line_total_gross: number;
}

export interface CartState {
  items: CartItem[];
  total_net: number;
  total_vat: number;
  total_gross: number;
}

// Status display helpers
export const orderNoteStatusConfig: Record<OrderNoteStatus, {
  label: string;
  labelPT: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: 'Draft',
    labelPT: 'Rascunho',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
  submitted: {
    label: 'Submitted',
    labelPT: 'Enviado',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  awaiting_approval: {
    label: 'Awaiting Approval',
    labelPT: 'Aguardando Aprovação',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  },
  approved: {
    label: 'Approved',
    labelPT: 'Aprovado',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  rejected: {
    label: 'Rejected',
    labelPT: 'Rejeitado',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  in_preparation: {
    label: 'In Preparation',
    labelPT: 'Em Preparação',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  invoiced: {
    label: 'Invoiced',
    labelPT: 'Faturado',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100'
  },
  cancelled: {
    label: 'Cancelled',
    labelPT: 'Cancelado',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  }
};

// Helper to calculate VAT
export function calculateVAT(netAmount: number, vatRate: number = 23): number {
  return netAmount * (vatRate / 100);
}

// Helper to calculate gross from net
export function calculateGross(netAmount: number, vatRate: number = 23): number {
  return netAmount + calculateVAT(netAmount, vatRate);
}
