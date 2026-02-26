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
      
      const { data, error } = await supabase
        .from('invoices')
        .select('total, status')
        .eq(column, entityId)
        .neq('status', 'draft');

      if (error) throw error;

      const result: FinancialKPIs = { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };

      for (const inv of data ?? []) {
        const total = Number(inv.total) || 0;
        result.totalInvoiced += total;
        switch (inv.status) {
          case 'paid':
            result.paid += total;
            break;
          case 'overdue':
            result.overdue += total;
            break;
          case 'unpaid':
          case 'sent':
            result.pending += total;
            break;
        }
      }

      return result;
    },
    enabled: !!entityId,
  });
}
