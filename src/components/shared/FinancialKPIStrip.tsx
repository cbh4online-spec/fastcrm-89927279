import { Euro, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { KPICard, KPIGrid } from '@/components/design-system/KPICard';
import { useFinancialKPIs } from '@/hooks/useFinancialKPIs';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FinancialKPIStripProps {
  entityType: 'contact' | 'company';
  entityId: string;
  /** 'cards' = grelha completa; 'header' = faixa compacta para o cabeçalho da ficha */
  variant?: 'cards' | 'header';
  className?: string;
}

const HEADER_ITEMS = [
  { key: 'totalInvoiced', label: 'Total Faturado', icon: Euro, tone: 'text-foreground' },
  { key: 'paid', label: 'Pago', icon: CheckCircle, tone: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'pending', label: 'Pendente', icon: Clock, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'overdue', label: 'Vencido', icon: AlertTriangle, tone: 'text-destructive' },
] as const;

export function FinancialKPIStrip({ entityType, entityId, variant = 'cards', className }: FinancialKPIStripProps) {
  const { data, isLoading } = useFinancialKPIs(entityType, entityId);
  const kpis = data ?? { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };

  if (variant === 'header') {
    return (
      <div
        className={cn(
          'flex items-stretch gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-1.5 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4',
          className,
        )}
        aria-label="Resumo financeiro"
      >
        {HEADER_ITEMS.map(({ key, label, icon: Icon, tone }) => (
          <div
            key={key}
            className="flex min-w-[130px] flex-col justify-center rounded-md bg-background px-3 py-2 shadow-sm"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', tone)} aria-hidden="true" />
              {label}
            </span>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-20" />
            ) : (
              <span className={cn('text-base font-semibold tabular-nums', tone)}>
                {formatCurrency(kpis[key])}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <KPIGrid columns={4}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </KPIGrid>
    );
  }

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
