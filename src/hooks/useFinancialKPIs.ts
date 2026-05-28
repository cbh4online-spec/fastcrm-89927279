import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialKPIs {
  totalInvoiced: number;
  paid: number;
  pending: number;
  overdue: number;
}

export function useFinancialKPIs(entityType: 'contact' | 'company', entityId: string) {
  return useQuery({
    queryKey: ['financial-kpis', entityType, entityId],
    queryFn: async (): Promise<FinancialKPIs> => {
      let invoices: { id: string; total: number | null; status: string | null }[] = [];

      if (entityType === 'company') {
        // Aggregate: invoices linked directly to the company OR via its contacts
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('company_id', entityId)
          .is('deleted_at', null);
        const contactIds = (contacts || []).map((c: any) => c.id);

        const directQ = supabase
          .from('invoices')
          .select('id, total, status')
          .eq('company_id', entityId)
          .not('status', 'in', '("draft","cancelled")');

        const viaContactsQ = contactIds.length > 0
          ? supabase
              .from('invoices')
              .select('id, total, status')
              .in('contact_id', contactIds)
              .not('status', 'in', '("draft","cancelled")')
          : Promise.resolve({ data: [] as any[], error: null });

        const [direct, viaContacts] = await Promise.all([directQ, viaContactsQ]);
        if (direct.error) throw direct.error;
        if ((viaContacts as any).error) throw (viaContacts as any).error;

        const dedup = new Map<string, any>();
        for (const inv of [...(direct.data || []), ...((viaContacts as any).data || [])]) {
          dedup.set(inv.id, inv);
        }
        invoices = Array.from(dedup.values());
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, total, status')
          .eq('contact_id', entityId)
          .not('status', 'in', '("draft","cancelled")');
        if (error) throw error;
        invoices = data || [];
      }

      if (!invoices.length) {
        return { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
      }

      const invoiceIds = invoices.map(i => i.id);
      const { data: payments, error: payError } = await supabase
        .from('invoice_payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);
      if (payError) throw payError;

      const paidPerInvoice: Record<string, number> = {};
      for (const p of payments ?? []) {
        paidPerInvoice[p.invoice_id] = (paidPerInvoice[p.invoice_id] || 0) + Number(p.amount);
      }

      const result: FinancialKPIs = { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
      for (const inv of invoices) {
        const total = Number(inv.total) || 0;
        const actualPaid = paidPerInvoice[inv.id] || 0;
        result.totalInvoiced += total;
        result.paid += actualPaid;
        const remaining = total - actualPaid;
        if (remaining > 0) {
          if (inv.status === 'overdue') result.overdue += remaining;
          else result.pending += remaining;
        }
      }

      return result;
    },
    enabled: !!entityId,
  });
}
