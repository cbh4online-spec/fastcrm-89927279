import { Euro, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { KPICard, KPIGrid } from '@/components/design-system/KPICard';
import { useFinancialKPIs } from '@/hooks/useFinancialKPIs';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialKPIStripProps {
  entityType: 'contact' | 'company';
  entityId: string;
}

export function FinancialKPIStrip({ entityType, entityId }: FinancialKPIStripProps) {
  const { data, isLoading } = useFinancialKPIs(entityType, entityId);

  if (isLoading) {
    return (
      <KPIGrid columns={4}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </KPIGrid>
    );
  }

  const kpis = data ?? { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };

  return (
    <KPIGrid columns={4}>
      <KPICard
        title="Total Faturado"
        value={formatCurrency(kpis.totalInvoiced)}
        icon={<Euro className="h-4 w-4" />}
        variant="primary"
      />
      <KPICard
        title="Pago"
        value={formatCurrency(kpis.paid)}
        icon={<CheckCircle className="h-4 w-4" />}
        variant="success"
      />
      <KPICard
        title="Pendente"
        value={formatCurrency(kpis.pending)}
        icon={<Clock className="h-4 w-4" />}
        variant="warning"
      />
      <KPICard
        title="Vencido"
        value={formatCurrency(kpis.overdue)}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant="destructive"
      />
    </KPIGrid>
  );
}
