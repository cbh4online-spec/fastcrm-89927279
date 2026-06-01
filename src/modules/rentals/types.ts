export type RentalStatus = "draft" | "active" | "ended" | "renewed" | "cancelled" | "defaulted";
export type EquipmentStatus = "in_stock" | "assigned" | "returned" | "broken" | "retired";

export interface RentalContract {
  id: string;
  workspace_id: string;
  contract_number: string;
  end_client_company_id: string | null;
  end_client_contact_id: string | null;
  financier_company_id: string;
  status: RentalStatus;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  monthly_amount: number;
  total_financed: number;
  financier_commission: number;
  currency: string;
  notes: string | null;
  liquid_invoice_id: string | null;
  client_note_id: string | null;
  renewed_from_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  end_client?: { id: string; name: string; tax_id: string | null } | null;
  financier?: { id: string; name: string; tax_id: string | null } | null;
  items?: RentalContractItem[];
}

export interface RentalContractItem {
  id: string;
  contract_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  position: number;
  serial_numbers?: string[]; // virtual, derived from equipment_units
  product?: { id: string; name: string; sku: string | null } | null;
}

export interface EquipmentUnit {
  id: string;
  workspace_id: string;
  product_id: string | null;
  serial_number: string;
  status: EquipmentStatus;
  current_contract_id: string | null;
  current_client_company_id: string | null;
  assigned_at: string | null;
  returned_at: string | null;
  purchase_date: string | null;
  warranty_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; sku: string | null } | null;
  current_contract?: { id: string; contract_number: string } | null;
  current_client?: { id: string; name: string } | null;
}

export interface EquipmentHistoryEvent {
  id: string;
  equipment_unit_id: string;
  event_type: string;
  contract_id: string | null;
  invoice_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface RentalContractEvent {
  id: string;
  contract_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface NewRentalLineInput {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  serial_numbers: string[];
  track_serials?: boolean;
}

export interface CreateRentalContractInput {
  end_client_company_id: string;
  end_client_contact_id?: string | null;
  financier_company_id: string;
  start_date: string;
  duration_months: number;
  monthly_amount: number;
  financier_commission?: number;
  notes?: string;
  items: NewRentalLineInput[];
  emit_financier_invoice: boolean;
  emit_client_note: boolean;
}
