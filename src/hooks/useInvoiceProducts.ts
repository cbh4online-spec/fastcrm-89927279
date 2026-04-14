import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceProduct {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  invoice_status: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  product?: {
    id: string;
    name: string;
    category: string | null;
    product_type: string | null;
    consumption_model: string | null;
    is_trackable: boolean | null;
  } | null;
}

interface InvoiceLookup {
  id: string;
  status: string | null;
  issue_date: string | null;
  invoice_number: string | null;
  contact_id: string | null;
  contact?: { id: string; name: string } | { id: string; name: string }[] | null;
}

const INCLUDED_INVOICE_STATUSES = ["sent", "paid", "partially_paid", "overdue"];

function getContactName(invoice: InvoiceLookup | undefined) {
  if (!invoice?.contact) return null;
  const contact = Array.isArray(invoice.contact) ? invoice.contact[0] : invoice.contact;
  return contact?.name ?? null;
}

async function fetchInvoiceProducts(column: "contact_id" | "company_id", entityId: string): Promise<InvoiceProduct[]> {
  const { data: invoiceData, error: invError } = await supabase
    .from("invoices")
    .select("id, status, issue_date, invoice_number, contact_id, contact:contacts(id, name)")
    .eq(column, entityId)
    .in("status", INCLUDED_INVOICE_STATUSES);

  if (invError) throw invError;

  const invoices = (invoiceData || []) as InvoiceLookup[];
  if (invoices.length === 0) return [];

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select(`
      id, invoice_id, product_id, description, quantity, unit_price, total,
      product:products(id, name, category, product_type, consumption_model, is_trackable)
    `)
    .in("invoice_id", invoiceIds);

  if (itemsError) throw itemsError;

  return (items || [])
    .map((item) => {
      const invoice = invoiceMap.get(item.invoice_id);
      return {
        ...item,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || 0,
        invoice_status: invoice?.status || null,
        invoice_date: invoice?.issue_date || null,
        invoice_number: invoice?.invoice_number || null,
        contact_id: invoice?.contact_id || null,
        contact_name: getContactName(invoice),
        product: item.product as InvoiceProduct["product"],
      };
    })
    .sort((a, b) => {
      const aDate = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
      const bDate = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
      return bDate - aDate;
    });
}

export function useContactInvoiceProducts(contactId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-products", "contact", contactId],
    queryFn: async (): Promise<InvoiceProduct[]> => {
      if (!contactId) return [];
      return fetchInvoiceProducts("contact_id", contactId);
    },
    enabled: !!contactId,
  });
}

export function useCompanyInvoiceProducts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-products", "company", companyId],
    queryFn: async (): Promise<InvoiceProduct[]> => {
      if (!companyId) return [];
      return fetchInvoiceProducts("company_id", companyId);
    },
    enabled: !!companyId,
  });
}
