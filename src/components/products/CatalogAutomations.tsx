import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot, ChevronDown, ChevronUp, Clock, AlertTriangle, ImageOff,
  TrendingDown, X, DollarSign,
} from "lucide-react";
import type { Product } from "@/types/product";

interface Props {
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
  onFilterSelect?: (filterId: string) => void;
}

interface AutomationAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  filterId?: string;
}

const DISMISSED_KEY = "catalog-automation-dismissed";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); }
  catch { return []; }
}

function setDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export function CatalogAutomations({ products, formatCurrency, onFilterSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissedState] = useState<string[]>(() => getDismissed());

  const dismiss = useCallback((id: string) => {
    const updated = [...dismissed, id];
    setDismissedState(updated);
    setDismissed(updated);
  }, [dismissed]);

  const alerts = useMemo<AutomationAlert[]>(() => {
    if (!products.length) return [];
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    const result: AutomationAlert[] = [];

    // Stale prices
    const stale = products.filter(p => p.base_price > 0 && (now - new Date(p.updated_at).getTime()) > ninetyDays);
    if (stale.length > 0) {
      result.push({
        id: "stale_price",
        severity: "warning",
        icon: <Clock className="h-4 w-4" />,
        title: "Preços desatualizados",
        description: `${stale.length} produto${stale.length > 1 ? "s" : ""} sem atualização há mais de 90 dias`,
        count: stale.length,
      });
    }

    // No image
    const noImg = products.filter(p => !p.images || p.images.length === 0);
    if (noImg.length > 0) {
      result.push({
        id: "no_image",
        severity: "warning",
        icon: <ImageOff className="h-4 w-4" />,
        title: "Sem imagem",
        description: `${noImg.length} produto${noImg.length > 1 ? "s" : ""} sem imagem associada`,
        count: noImg.length,
        filterId: "smart_no_image",
      });
    }

    // Negative margin
    const negMargin = products.filter(p => p.direct_cost && p.base_price > 0 && p.direct_cost > p.base_price);
    if (negMargin.length > 0) {
      result.push({
        id: "negative_margin",
        severity: "critical",
        icon: <TrendingDown className="h-4 w-4" />,
        title: "Margem negativa",
        description: `${negMargin.length} produto${negMargin.length > 1 ? "s" : ""} com custo superior ao preço`,
        count: negMargin.length,
        filterId: "smart_negative_margin",
      });
    }

    // Below target margin (< 15%)
    const lowMargin = products.filter(p => {
      if (!p.base_price || !p.direct_cost || p.base_price === 0) return false;
      const m = ((p.base_price - p.direct_cost) / p.base_price) * 100;
      return m > 0 && m < 15;
    });
    if (lowMargin.length > 0) {
      result.push({
        id: "low_margin",
        severity: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Margem abaixo de 15%",
        description: `${lowMargin.length} produto${lowMargin.length > 1 ? "s" : ""} com margem inferior ao threshold`,
        count: lowMargin.length,
        filterId: "smart_low_margin",
      });
    }

    // Price suggestions (products with cost but no price)
    const noPriceWithCost = products.filter(p => (!p.base_price || p.base_price === 0) && p.direct_cost && p.direct_cost > 0);
    if (noPriceWithCost.length > 0) {
      result.push({
        id: "suggest_price",
        severity: "info",
        icon: <DollarSign className="h-4 w-4" />,
        title: "Sugestão de preço",
        description: `${noPriceWithCost.length} produto${noPriceWithCost.length > 1 ? "s" : ""} com custo definido mas sem preço — considere margem-alvo de 30%`,
        count: noPriceWithCost.length,
        filterId: "smart_no_price",
      });
    }

    return result;
  }, [products]);

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  const criticalCount = visibleAlerts.filter(a => a.severity === "critical").length;
  const warningCount = visibleAlerts.filter(a => a.severity === "warning").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Bot className="h-4 w-4" />
          Automações
          {criticalCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">{criticalCount}</Badge>}
          {warningCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{warningCount}</Badge>}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {visibleAlerts.map(alert => (
            <Card
              key={alert.id}
              className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                alert.severity === "critical" ? "border-destructive/40" :
                alert.severity === "warning" ? "border-yellow-300 dark:border-yellow-700" :
                "border-blue-200 dark:border-blue-800"
              }`}
              onClick={() => alert.filterId && onFilterSelect?.(alert.filterId)}
            >
              <span className={
                alert.severity === "critical" ? "text-destructive" :
                alert.severity === "warning" ? "text-yellow-600" :
                "text-blue-600"
              }>
                {alert.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">{alert.count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(alert.id); }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Dispensar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
