import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert,
  DollarSign, TrendingUp, Package, AlertTriangle,
  TrendingDown, ImageOff, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
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

    // Health score
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

    // By category for chart
    const catMap = new Map<string, number>();
    products.forEach(p => {
      const cat = p.category?.trim() || "Sem categoria";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const byCategory = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Top margin
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

  // Quick-filter chips with issue counts
  const issueChips = [
    { id: "smart_no_price", label: "Sem preço", count: productIndicators.noPrice, icon: <DollarSign className="h-3 w-3" />, color: "text-destructive" },
    { id: "smart_no_cost", label: "Sem custo", count: productIndicators.noCost, icon: <AlertTriangle className="h-3 w-3" />, color: "text-yellow-600" },
    { id: "smart_negative_margin", label: "Margem −", count: productIndicators.negativeMargin, icon: <TrendingDown className="h-3 w-3" />, color: "text-destructive" },
    { id: "smart_low_margin", label: "Margem ↓", count: productIndicators.lowMargin, icon: <AlertTriangle className="h-3 w-3" />, color: "text-yellow-600" },
    { id: "smart_no_image", label: "S/ imagem", count: productIndicators.noImage, icon: <ImageOff className="h-3 w-3" />, color: "text-muted-foreground" },
  ].filter(c => c.count > 0);

  return (
    <div className="mb-3 space-y-2 hidden md:block">
      {/* ── Compact summary bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Health score pill */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border text-xs cursor-default">
                {stats.healthScore >= 70 ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-yellow-600" />
                )}
                <span className="font-medium">{stats.healthScore}</span>
                <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stats.healthScore >= 70 ? "bg-green-500" : stats.healthScore >= 40 ? "bg-yellow-500" : "bg-destructive"}`}
                    style={{ width: `${stats.healthScore}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Saúde do catálogo: {stats.healthScore}/100</p>
              <p className="text-[10px] text-muted-foreground">Preço (25%), Custo (25%), Imagem (20%), Categoria (15%), SKU (15%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Key metrics inline */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-card border text-xs">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold">{formatCurrency(stats.totalValue)}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-card border text-xs">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          <span className={`font-semibold ${stats.avgMargin >= 30 ? "text-green-600" : stats.avgMargin >= 15 ? "text-yellow-600" : "text-destructive"}`}>
            {stats.avgMargin.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-card border text-xs">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold">{stats.total}</span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-border" />

        {/* Issue filter chips */}
        {issueChips.map(chip => (
          <button
            key={chip.id}
            onClick={() => onFilterSelect(chip.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border ${
              activeFilterId === chip.id
                ? "border-primary bg-primary/10 font-medium"
                : "border-transparent bg-muted/50 hover:bg-muted"
            }`}
          >
            <span className={chip.color}>{chip.icon}</span>
            <span>{chip.label}</span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{chip.count}</Badge>
          </button>
        ))}

        {/* Expand analytics toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDetailOpen(!detailOpen)}
          className="ml-auto gap-1 text-xs text-muted-foreground h-7 px-2"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
          {detailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* ── Expandable analytics panel ── */}
      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* By Category */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-48 px-4 pb-3">
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
              </CardContent>
            </Card>

            {/* Top Margin */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Top 10 Margem</CardTitle>
              </CardHeader>
              <CardContent className="h-48 px-4 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topMargin} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                    <RTooltip formatter={(v: number) => [`${v}%`, "Margem"]} />
                    <Bar dataKey="margin" fill="hsl(150 60% 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
