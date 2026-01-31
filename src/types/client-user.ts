// Types for Client Users (B2B Professional Clients)

export type ClientUserStatus = 'active' | 'suspended' | 'pending';

export interface ClientUser {
  id: string;
  auth_user_id: string;
  workspace_id: string;
  contact_id: string | null;
  company_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  tax_id: string | null;
  billing_address: AddressData;
  shipping_address: AddressData;
  credit_limit: number;
  payment_terms: string;
  status: ClientUserStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: {
    id: string;
    name: string;
    email: string | null;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface AddressData {
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  additional_info?: string;
}

export interface CreateClientUserData {
  workspace_id: string;
  name: string;
  email: string;
  phone?: string;
  tax_id?: string;
  billing_address?: AddressData;
  shipping_address?: AddressData;
  credit_limit?: number;
  payment_terms?: string;
  contact_id?: string;
  company_id?: string;
  notes?: string;
}

export interface UpdateClientUserData {
  name?: string;
  phone?: string;
  tax_id?: string;
  billing_address?: AddressData;
  shipping_address?: AddressData;
  credit_limit?: number;
  payment_terms?: string;
  status?: ClientUserStatus;
  notes?: string;
}

// Status display helpers
export const clientUserStatusConfig: Record<ClientUserStatus, {
  label: string;
  labelPT: string;
  color: string;
  bgColor: string;
}> = {
  active: {
    label: 'Active',
    labelPT: 'Activo',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  suspended: {
    label: 'Suspended',
    labelPT: 'Suspenso',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  pending: {
    label: 'Pending',
    labelPT: 'Pendente',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  }
};
