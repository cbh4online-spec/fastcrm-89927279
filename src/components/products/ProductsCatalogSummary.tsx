import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert,
  DollarSign, TrendingUp, Package, AlertTriangle,
  TrendingDown, ImageOff, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { IXCard } from "@/components/entity/ix/IXCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface Props {
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
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
  /** Quando false, oculta KPIs/chips/gráficos de custo e margem (ex.: agentes). */
  canViewCostMargin?: boolean;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220 70% 55%)",
  "hsl(150 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 55%)",
  "hsl(0 70% 55%)",
  "hsl(180 50% 45%)",
];

interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}

function KpiTile({ label, value, hint, icon, tone = "neutral" }: KpiTileProps) {
  const toneClass =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "warning" ? "text-amber-600 dark:text-amber-400" :
    tone === "danger" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
      </div>
      <div className={cn("mt-2 text-2xl font-bold tabular-nums", toneClass)}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ProductsCatalogSummary({
  products,
  formatCurrency,
  productIndicators,
  activeFilterId,
  onFilterSelect,
  canViewCostMargin = true,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  const stats = useMemo(() => {
    if (!products.length) return null;
    const totalValue = products.reduce((sum, p) => sum + (p.base_price || 0), 0);
    const withMargin = products.filter(p => p.base_price && p.direct_cost && p.base_price > 0);
    const totalRevenue = withMargin.reduce((s, p) => s + p.base_price, 0);
    const totalCost = withMargin.reduce((s, p) => s + (p.direct_cost || 0), 0);
    const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    const total = products.length;
    const withPrice = products.filter(p => p.base_price > 0).length;
    const withCostCount = products.filter(p => p.direct_cost && p.direct_cost > 0).length;
    const withImage = products.filter(p => (p.images && p.images.length > 0) || ((p as any).product_images?.length > 0)).length;
    const withCategory = products.filter(p => p.category && p.category.trim()).length;
    const withSKU = products.filter(p => p.sku && p.sku.trim()).length;
    const healthScore = Math.round(
      ((withPrice / total) * 25 +
        (withCostCount / total) * 25 +
        (withImage / total) * 20 +
        (withCategory / total) * 15 +
        (withSKU / total) * 15)
    );

    const catMap = new Map<string, number>();
    products.forEach(p => {
      const cat = p.category?.trim() || "Sem categoria";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const byCategory = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topMargin = withMargin
      .map(p => ({
        name: p.name.length > 25 ? p.name.slice(0, 25) + "…" : p.name,
        margin: Math.round(((p.base_price - (p.direct_cost ?? 0)) / p.base_price) * 100),
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    return { totalValue, avgMargin, healthScore, total, byCategory, topMargin, withCostCount, withImage, withCategory, withPrice };
  }, [products]);

  if (!stats) return null;

  const issueChips = [
    { id: "smart_no_price", label: "Sem preço", count: productIndicators.noPrice, icon: <DollarSign className="h-3 w-3" /> },
    ...(canViewCostMargin ? [
      { id: "smart_no_cost", label: "Sem custo", count: productIndicators.noCost, icon: <AlertTriangle className="h-3 w-3" /> },
      { id: "smart_negative_margin", label: "Margem negativa", count: productIndicators.negativeMargin, icon: <TrendingDown className="h-3 w-3" /> },
      { id: "smart_low_margin", label: "Margem baixa", count: productIndicators.lowMargin, icon: <AlertTriangle className="h-3 w-3" /> },
    ] : []),
    { id: "smart_no_image", label: "Sem imagem", count: productIndicators.noImage, icon: <ImageOff className="h-3 w-3" /> },
  ].filter(c => c.count > 0);

  const healthTone: KpiTileProps["tone"] =
    stats.healthScore >= 70 ? "success" : stats.healthScore >= 40 ? "warning" : "danger";
  const marginTone: KpiTileProps["tone"] =
    stats.avgMargin >= 30 ? "success" : stats.avgMargin >= 15 ? "warning" : "danger";

  return (
    <div className="mb-4 space-y-3 hidden md:block">
      <div className={cn(
        "grid gap-3",
        canViewCostMargin ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"
      )}>
        <KpiTile
          label="Saúde do catálogo"
          value={`${stats.healthScore}/100`}
          hint="Preço · Custo · Imagem · Categoria · SKU"
          icon={stats.healthScore >= 70 ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          tone={healthTone}
        />
        <KpiTile
          label="Valor total"
          value={formatCurrency(stats.totalValue)}
          hint={`${stats.total} produtos`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        {canViewCostMargin && (
          <KpiTile
            label="Margem média"
            value={`${stats.avgMargin.toFixed(1)}%`}
            hint={`${stats.withCostCount} com custo`}
            icon={<TrendingUp className="h-4 w-4" />}
            tone={marginTone}
          />
        )}
        <KpiTile
          label="Catálogo"
          value={stats.total}
          hint={`${stats.withPrice} c/ preço · ${stats.withImage} c/ imagem`}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {(issueChips.length > 0 || true) && (
        <div className="flex items-center gap-2 flex-wrap">
          {issueChips.map(chip => {
            const active = activeFilterId === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => onFilterSelect(chip.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {chip.icon}
                <span>{chip.label}</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] rounded-full ml-0.5">{chip.count}</Badge>
              </button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailOpen(!detailOpen)}
            aria-expanded={detailOpen}
            aria-controls="catalog-analytics-panel"
            className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
            {detailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      )}

      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleContent id="catalog-analytics-panel">
          <IXCard
            className="mt-1"
            title="Analytics do catálogo"
            description="Distribuição e performance dos produtos ativos"
            actions={
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px] font-medium">
                  {stats.byCategory.length} categorias
                </Badge>
                {canViewCostMargin && (
                  <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px] font-medium">
                    {stats.withCostCount} c/ margem
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </div>
            }
            contentClassName="pt-2"
          >
            <div className={cn(
              "grid gap-4",
              canViewCostMargin ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Distribuição por categoria
                  </span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    Top {stats.byCategory.length}
                  </Badge>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={2}>
                        {stats.byCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v: number) => [v, "Produtos"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {canViewCostMargin && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Top 10 margem
                    </span>
                    <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                      {stats.topMargin.length} produtos
                    </Badge>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.topMargin} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                        <RTooltip formatter={(v: number) => [`${v}%`, "Margem"]} />
                        <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </IXCard>
        </CollapsibleContent>
      </Collapsible>

    </div>
  );
}
