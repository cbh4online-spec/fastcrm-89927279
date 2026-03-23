import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Zap, BarChart3, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductionGuideItem {
  label: string;
  done: boolean;
  hint?: string;
}

export interface ProductionGuideConfig {
  moduleName: string;
  dataChecklist: ProductionGuideItem[];
  automations: { name: string; active: boolean; description: string }[];
  kpis: { label: string; description: string }[];
}

export function ProductionGuideSection({ config }: { config: ProductionGuideConfig }) {
  const [open, setOpen] = useState(false);

  const doneCount = config.dataChecklist.filter(i => i.done).length;
  const total = config.dataChecklist.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="mt-8 border border-border/50 rounded-lg bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Como levar para produção — {config.moduleName}
          </span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            pct === 100 ? "bg-primary/20 text-primary" : "bg-accent text-accent-foreground"
          )}>
            {pct}% pronto
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 grid gap-4 md:grid-cols-3">
          {/* Data Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Dados Necessários
            </h4>
            <ul className="space-y-1">
              {config.dataChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className={cn("text-foreground", item.done && "line-through text-muted-foreground")}>{item.label}</span>
                    {item.hint && !item.done && <p className="text-muted-foreground mt-0.5">{item.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Automations */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Automações
            </h4>
            <ul className="space-y-1.5">
              {config.automations.map((auto, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      auto.active ? "bg-primary" : "bg-muted-foreground"
                    )} />
                    <span className="font-medium text-foreground">{auto.name}</span>
                  </div>
                  <p className="text-muted-foreground ml-3">{auto.description}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* KPIs */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> KPIs do Módulo
            </h4>
            <ul className="space-y-1.5">
              {config.kpis.map((kpi, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium text-foreground">{kpi.label}</span>
                  <p className="text-muted-foreground">{kpi.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
