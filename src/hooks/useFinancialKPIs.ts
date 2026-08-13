import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialKPIs {
  totalInvoiced: number;
  paid: number;
  pending: number;
  overdue: number;
}

type InvoiceRow = {
  id: string;
  total: number | null;
  status: string | null;
  amount_paid: number | null;
  due_date: string | null;
};

const SELECT_COLS = 'id, total, status, amount_paid, due_date';

export function useFinancialKPIs(entityType: 'contact' | 'company', entityId: string) {
  return useQuery({
    queryKey: ['financial-kpis', entityType, entityId],
    queryFn: async (): Promise<FinancialKPIs> => {
      let invoices: InvoiceRow[] = [];

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
          .select(SELECT_COLS)
          .eq('company_id', entityId)
          .not('status', 'in', '("draft","cancelled")');

        const viaContactsQ = contactIds.length > 0
          ? supabase
              .from('invoices')
              .select(SELECT_COLS)
              .in('contact_id', contactIds)
              .not('status', 'in', '("draft","cancelled")')
          : Promise.resolve({ data: [] as any[], error: null });

        const [direct, viaContacts] = await Promise.all([directQ, viaContactsQ]);
        if (direct.error) throw direct.error;
        if ((viaContacts as any).error) throw (viaContacts as any).error;

        const dedup = new Map<string, InvoiceRow>();
        for (const inv of [...(direct.data || []), ...((viaContacts as any).data || [])]) {
          dedup.set(inv.id, inv as InvoiceRow);
        }
        invoices = Array.from(dedup.values());
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .select(SELECT_COLS)
          .eq('contact_id', entityId)
          .not('status', 'in', '("draft","cancelled")');
        if (error) throw error;
        invoices = (data || []) as InvoiceRow[];
      }

      if (!invoices.length) {
        return { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
      }

      const invoiceIds = invoices.map(i => i.id);
      // Pagamentos registados (pode falhar/ficar vazio — nesse caso usamos amount_paid da fatura)
      const { data: payments } = await supabase
        .from('invoice_payments')
        .select('invoice_id, amount')
        .in('invoice_id', invoiceIds);

      const paidPerInvoice: Record<string, number> = {};
      for (const p of payments ?? []) {
        paidPerInvoice[p.invoice_id] = (paidPerInvoice[p.invoice_id] || 0) + Number(p.amount);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result: FinancialKPIs = { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
      for (const inv of invoices) {
        const total = Number(inv.total) || 0;
        // Cruzar histórico de pagamentos com o amount_paid da fatura (SAF-T)
        const fromPayments = paidPerInvoice[inv.id] || 0;
        const fromInvoice = Number(inv.amount_paid) || 0;
        const actualPaid = Math.min(total, Math.max(fromPayments, fromInvoice));

        result.totalInvoiced += total;
        result.paid += actualPaid;

        const remaining = total - actualPaid;
        if (remaining > 0.005) {
          const due = inv.due_date ? new Date(inv.due_date) : null;
          const isOverdue = inv.status === 'overdue' || (due != null && !Number.isNaN(due.getTime()) && due < today);
          if (isOverdue) result.overdue += remaining;
          else result.pending += remaining;
        }
      }

      return result;
    },
    enabled: !!entityId,
  });
}
