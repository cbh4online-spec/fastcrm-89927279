import { Package, DollarSign, AlertTriangle, TrendingDown, ImageOff } from "lucide-react";

interface HealthIndicator {
  label: string;
  value: number;
  icon: React.ReactNode;
  filter?: string;
  variant: "default" | "destructive" | "warning";
}

interface ProductHealthIndicatorsProps {
  productIndicators: {
    total: number;
    noPrice: number;
    noCost: number;
    negativeMargin: number;
    lowMargin: number;
    noImage: number;
  };
  activeFilterId?: string;
  onFilterSelect: (filterId: string) => void;
}

export function ProductHealthIndicators({
  productIndicators,
  activeFilterId,
  onFilterSelect,
}: ProductHealthIndicatorsProps) {
  const indicators: HealthIndicator[] = [
    { label: "Total", value: productIndicators.total, icon: <Package className="h-3.5 w-3.5" />, filter: undefined, variant: "default" },
    { label: "Sem preço", value: productIndicators.noPrice, icon: <DollarSign className="h-3.5 w-3.5" />, filter: "smart_no_price", variant: "destructive" },
    { label: "Sem custo", value: productIndicators.noCost, icon: <AlertTriangle className="h-3.5 w-3.5" />, filter: "smart_no_cost", variant: "warning" },
    { label: "Margem negativa", value: productIndicators.negativeMargin, icon: <TrendingDown className="h-3.5 w-3.5" />, filter: "smart_negative_margin", variant: "destructive" },
    { label: "Margem baixa", value: productIndicators.lowMargin, icon: <AlertTriangle className="h-3.5 w-3.5" />, filter: "smart_low_margin", variant: "warning" },
    { label: "Sem imagem", value: productIndicators.noImage, icon: <ImageOff className="h-3.5 w-3.5" />, filter: "smart_no_image", variant: "default" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {indicators.map((ind) => (
        <button
          key={ind.label}
          onClick={() => ind.filter && onFilterSelect(ind.filter)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
            activeFilterId === ind.filter
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-muted/50"
          } ${ind.filter ? "cursor-pointer" : "cursor-default"}`}
        >
          <span
            className={
              ind.variant === "destructive" && ind.value > 0
                ? "text-destructive"
                : ind.variant === "warning" && ind.value > 0
                  ? "text-warning"
                  : "text-muted-foreground"
            }
          >
            {ind.icon}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none">{ind.value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{ind.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
