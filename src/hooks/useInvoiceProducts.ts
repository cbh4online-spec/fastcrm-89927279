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
  product?: {
    id: string;
    name: string;
    category: string | null;
    product_type: string | null;
    consumption_model: string | null;
    is_trackable: boolean | null;
  } | null;
}

// Fetch products from invoices for a contact
export function useContactInvoiceProducts(contactId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-products", "contact", contactId],
    queryFn: async (): Promise<InvoiceProduct[]> => {
      if (!contactId) return [];

      // Get invoices for this contact
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("id, status, issue_date")
        .eq("contact_id", contactId)
        .in("status", ["sent", "paid", "overdue"]);

      if (invError) throw invError;
      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(i => i.id);
      const invoiceMap = new Map(invoices.map(i => [i.id, i]));

      // Get invoice items with product info
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          id, invoice_id, product_id, description, quantity, unit_price, total,
          product:products(id, name, category, product_type, consumption_model, is_trackable)
        `)
        .in("invoice_id", invoiceIds);

      if (itemsError) throw itemsError;

      return (items || []).map(item => {
        const invoice = invoiceMap.get(item.invoice_id);
        return {
          ...item,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          invoice_status: invoice?.status || null,
          invoice_date: invoice?.issue_date || null,
          product: item.product as InvoiceProduct['product'],
        };
      });
    },
    enabled: !!contactId,
  });
}

// Fetch products from invoices for a company
export function useCompanyInvoiceProducts(companyId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-products", "company", companyId],
    queryFn: async (): Promise<InvoiceProduct[]> => {
      if (!companyId) return [];

      // Get invoices for this company
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("id, status, issue_date")
        .eq("company_id", companyId)
        .in("status", ["sent", "paid", "overdue"]);

      if (invError) throw invError;
      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(i => i.id);
      const invoiceMap = new Map(invoices.map(i => [i.id, i]));

      // Get invoice items with product info
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          id, invoice_id, product_id, description, quantity, unit_price, total,
          product:products(id, name, category, product_type, consumption_model, is_trackable)
        `)
        .in("invoice_id", invoiceIds);

      if (itemsError) throw itemsError;

      return (items || []).map(item => {
        const invoice = invoiceMap.get(item.invoice_id);
        return {
          ...item,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          invoice_status: invoice?.status || null,
          invoice_date: invoice?.issue_date || null,
          product: item.product as InvoiceProduct['product'],
        };
      });
    },
    enabled: !!companyId,
  });
}
