import { Users, TrendingUp, UserCheck, ArrowRight } from "lucide-react";
import type { LifecycleStageCounts } from "@/hooks/useCustomerLifecycle";

interface LifecycleKPIsProps {
  data: LifecycleStageCounts[];
}

export function LifecycleKPIs({ data }: LifecycleKPIsProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const leads = data.find(d => d.stage === 'lead')?.count || 0;
  const customers = data.find(d => d.stage === 'customer')?.count || 0;
  const conversionRate = leads > 0 ? ((customers / leads) * 100).toFixed(1) : '0';
  const prospects = data.find(d => d.stage === 'prospect')?.count || 0;
  const inSales = data.find(d => d.stage === 'sales')?.count || 0;

  const kpis = [
    { label: 'Total Contactos', value: total, icon: Users, color: 'text-primary' },
    { label: 'Conversão Lead → Cliente', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Prospects Activos', value: prospects + inSales, icon: ArrowRight, color: 'text-amber-500' },
    { label: 'Clientes', value: customers, icon: UserCheck, color: 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map(kpi => (
        <div key={kpi.label} className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            <span className="text-xs text-muted-foreground">{kpi.label}</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
        </div>
      ))}
    </div>
  );
}
