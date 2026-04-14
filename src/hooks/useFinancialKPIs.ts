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
      const column = entityType === 'contact' ? 'contact_id' : 'company_id';
      
      // Fetch invoices (excluding drafts and cancelled)
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, total, status')
        .eq(column, entityId)
        .not('status', 'in', '("draft","cancelled")');

      if (invError) throw invError;

      if (!invoices?.length) {
        return { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
      }

      // Fetch actual payments for these invoices
      const invoiceIds = invoices.map(i => i.id);
      const { data: payments, error: payError } = await supabase
        .from('invoice_payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);

      if (payError) throw payError;

      // Sum payments per invoice
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
          if (inv.status === 'overdue') {
            result.overdue += remaining;
          } else {
            result.pending += remaining;
          }
        }
      }

      return result;
    },
    enabled: !!entityId,
  });
}
