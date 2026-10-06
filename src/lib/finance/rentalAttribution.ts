/**
 * Atribuição comercial de faturação em contratos de renting.
 * A fatura fiscal é emitida à financeira, mas o cliente comercial é o cliente final.
 * Proformas/rascunhos/anuladas nunca contam como faturado.
 */
export interface RentalInfo {
  end_client_id: string | null;
  end_client_name: string | null;
  financier_id: string | null;
  financier_name: string | null;
}

export interface AttributableInvoice {
  id: string;
  status: string | null;
  document_type?: string | null;
  client_name: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  total: number | string | null;
  rental_contract_id?: string | null;
}

export interface ClientAttribution {
  key: string;
  name: string;
  total: number;
  count: number;
  viaFinanciers: string[];
}

const COUNTABLE_STATUSES = new Set(["sent", "paid", "partially_paid", "overdue"]);
const NON_FISCAL_TYPES = new Set(["proforma", "quote", "estimate"]);

export function isCountableInvoice(inv: AttributableInvoice): boolean {
  if (!inv.status || !COUNTABLE_STATUSES.has(inv.status)) return false;
  if (inv.document_type && NON_FISCAL_TYPES.has(inv.document_type)) return false;
  return true;
}

export function aggregateClientsWithRental(
  invoices: AttributableInvoice[],
  rentals: Record<string, RentalInfo>,
): ClientAttribution[] {
  const map = new Map<string, ClientAttribution>();
  for (const inv of invoices) {
    if (!isCountableInvoice(inv)) continue;
    const rental = inv.rental_contract_id ? rentals[inv.rental_contract_id] : undefined;
    let key: string;
    let name: string;
    let via: string | null = null;
    if (rental?.end_client_name && inv.company_id && inv.company_id === rental.financier_id) {
      key = rental.end_client_id || rental.end_client_name;
      name = rental.end_client_name;
      via = rental.financier_name || inv.client_name;
    } else {
      key = inv.company_id || inv.contact_id || inv.client_name || inv.id;
      name = inv.client_name || "—";
    }
    const cur = map.get(key) ?? { key, name, total: 0, count: 0, viaFinanciers: [] };
    cur.total += Number(inv.total || 0);
    cur.count += 1;
    if (via && !cur.viaFinanciers.includes(via)) cur.viaFinanciers.push(via);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
