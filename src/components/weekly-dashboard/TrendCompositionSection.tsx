import { TrendingUp, PieChart, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PLACEHOLDERS = [
  { label: "Evolução de Vendas", sub: "Últimas 6 semanas", icon: TrendingUp },
  { label: "Leads por Fonte", sub: "Distribuição actual", icon: PieChart },
  { label: "Pipeline por Fase", sub: "Volume por etapa", icon: BarChart3 },
];

export function TrendCompositionSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground px-1">Tendências e Composição</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLACEHOLDERS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <div className="p-2.5 rounded-xl bg-muted/50">
                  <Icon className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
                <p className="text-[10px] text-muted-foreground/60 italic">
                  Disponível brevemente
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
