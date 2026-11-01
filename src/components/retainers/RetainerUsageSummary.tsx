import { cn } from "@/lib/utils";
import { formatMinutes, type RetainerUsage } from "@/lib/retainers/retainerUsage";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const LEVEL_BAR: Record<RetainerUsage["level"], string> = {
  ok: "bg-primary",
  warning: "bg-warning",
  critical: "bg-destructive",
  over: "bg-destructive",
};

export function RetainerUsageBar({ usage, compact }: { usage: RetainerUsage; compact?: boolean }) {
  const inc = usage.includedMinutes || 1;
  const projPct = Math.min(100, (usage.projectMinutes / inc) * 100);
  const tickPct = Math.min(100 - projPct, (usage.ticketMinutes / inc) * 100);
  return (
    <div className="space-y-1.5">
      <div
        className={cn("flex w-full overflow-hidden rounded-full bg-muted", compact ? "h-2" : "h-3")}
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage.pct)}
        aria-label={`Consumo da avença: ${Math.round(usage.pct)}%`}
      >
        <div className={cn("h-full", LEVEL_BAR[usage.level])} style={{ width: `${projPct}%` }} />
        <div className={cn("h-full opacity-60", LEVEL_BAR[usage.level])} style={{ width: `${tickPct}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{formatMinutes(usage.usedMinutes)} de {formatMinutes(usage.includedMinutes)} ({Math.round(usage.pct)}%)</span>
        {usage.overageMinutes > 0
          ? <span className="font-medium text-destructive">+{formatMinutes(usage.overageMinutes)} extra · {eur(usage.overageCost)}</span>
          : <span>Restam {formatMinutes(usage.remainingMinutes)}</span>}
      </div>
    </div>
  );
}

export function RetainerKpis({ usage, monthlyFee }: { usage: RetainerUsage; monthlyFee: number }) {
  const items = [
    { label: "Plafond do mês", value: formatMinutes(usage.includedMinutes) },
    { label: "Projetos", value: formatMinutes(usage.projectMinutes) },
    { label: "Suporte", value: formatMinutes(usage.ticketMinutes) },
    { label: "Saldo disponível", value: formatMinutes(usage.remainingMinutes) },
    { label: "Horas extra", value: formatMinutes(usage.overageMinutes), danger: usage.overageMinutes > 0 },
    { label: "A faturar no mês", value: eur(monthlyFee + usage.overageCost), hint: usage.overageCost > 0 ? `inclui ${eur(usage.overageCost)} extra` : "só mensalidade" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((k) => (
        <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
          <p className={cn("mt-1 text-2xl font-bold", k.danger ? "text-destructive" : "text-foreground")}>{k.value}</p>
          {k.hint && <p className="text-xs text-muted-foreground">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}
