import { LIFECYCLE_STAGES, type LifecycleStageCounts, type LifecycleMetrics } from "@/hooks/useCustomerLifecycle";

interface LifecycleConversionTableProps {
  data: LifecycleStageCounts[];
  metrics?: LifecycleMetrics;
}

export function LifecycleConversionTable({ data, metrics }: LifecycleConversionTableProps) {
  const mainStages = LIFECYCLE_STAGES.filter(s => s.stage !== 'churned');

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-foreground">Métricas por Fase</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-4 py-2 text-muted-foreground font-medium">Fase</th>
            <th className="text-right px-4 py-2 text-muted-foreground font-medium">Contactos</th>
            <th className="text-right px-4 py-2 text-muted-foreground font-medium">Tempo Médio</th>
            <th className="text-right px-4 py-2 text-muted-foreground font-medium">Conversão → Próxima</th>
          </tr>
        </thead>
        <tbody>
          {mainStages.map((s, i) => {
            const count = data.find(d => d.stage === s.stage)?.count || 0;
            const avgDays = metrics?.avgDaysPerStage?.[s.stage];
            const nextStage = mainStages[i + 1];
            const convKey = nextStage ? `${s.stage}_to_${nextStage.stage}` : null;
            const convRate = convKey ? metrics?.conversionRates?.[convKey] : null;
            const isLast = i === mainStages.length - 1;

            return (
              <tr key={s.stage} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="mr-2">{s.icon}</span>
                  <span className="font-medium text-foreground">{s.label}</span>
                </td>
                <td className="text-right px-4 py-2.5 text-foreground font-semibold">{count}</td>
                <td className="text-right px-4 py-2.5 text-muted-foreground">
                  {avgDays != null ? `${avgDays}d` : '—'}
                </td>
                <td className="text-right px-4 py-2.5">
                  {!isLast && convRate != null ? (
                    <span className="text-foreground font-semibold">{convRate}%</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
