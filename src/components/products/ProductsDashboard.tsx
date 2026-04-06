import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3, ChevronDown, ChevronUp, DollarSign,
  TrendingUp, Package, Image, FileText, Tag,
} from "lucide-react";
import type { Product } from "@/types/product";

interface ProductsDashboardProps {
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
}

export function ProductsDashboard({ products, formatCurrency }: ProductsDashboardProps) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("products-dashboard-visible") !== "false";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem("products-dashboard-visible", String(next)); } catch {}
  };

  const stats = useMemo(() => {
    if (!products.length) return null;

    const totalValue = products.reduce((sum, p) => sum + (p.base_price || 0), 0);
    
    // Weighted average margin
    const withMargin = products.filter(p => p.base_price && p.direct_cost && p.base_price > 0);
    const totalRevenue = withMargin.reduce((s, p) => s + p.base_price, 0);
    const totalCost = withMargin.reduce((s, p) => s + (p.direct_cost || 0), 0);
    const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    // Billing type distribution
    const billingDist = products.reduce((acc, p) => {
      acc[p.billing_type] = (acc[p.billing_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Product type distribution
    const typeDist = products.reduce((acc, p) => {
      acc[p.product_type] = (acc[p.product_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCount = products.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length;

    // Completeness
    const withImage = products.filter(p => (p.images && p.images.length > 0) || ((p as any).product_images?.length > 0)).length;
    const withCost = products.filter(p => p.direct_cost && p.direct_cost > 0).length;
    const withCategory = products.filter(p => p.category && p.category.trim()).length;
    const withDescription = products.filter(p => p.short_description || p.commercial_description).length;
    const completeness = Math.round(((withImage + withCost + withCategory + withDescription) / (products.length * 4)) * 100);

    return {
      totalValue,
      avgMargin,
      billingDist,
      typeDist,
      recentCount,
      completeness,
      withImage,
      withCost,
      withCategory,
      withDescription,
      total: products.length,
    };
  }, [products]);

  if (!stats) return null;

  return (
    <div className="mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="gap-2 mb-2 text-muted-foreground hover:text-foreground"
      >
        <BarChart3 className="h-4 w-4" />
        Dashboard
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total catalog value */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="p-3 cursor-default">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide font-medium">Valor Catálogo</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Soma de todos os preços base</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Average margin */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="p-3 cursor-default">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide font-medium">Margem Média</span>
                  </div>
                  <p className={`text-lg font-bold ${stats.avgMargin >= 30 ? "text-green-600" : stats.avgMargin >= 15 ? "text-yellow-600" : "text-destructive"}`}>
                    {stats.avgMargin.toFixed(1)}%
                  </p>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Margem média ponderada por receita</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Recent products */}
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Novos (30d)</span>
            </div>
            <p className="text-lg font-bold">{stats.recentCount}</p>
          </Card>

          {/* Completeness */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="p-3 cursor-default">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide font-medium">Completude</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">{stats.completeness}%</p>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${stats.completeness >= 80 ? "bg-green-500" : stats.completeness >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                        style={{ width: `${stats.completeness}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Imagem: {stats.withImage}/{stats.total}</p>
                <p>Custo: {stats.withCost}/{stats.total}</p>
                <p>Categoria: {stats.withCategory}/{stats.total}</p>
                <p>Descrição: {stats.withDescription}/{stats.total}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Billing distribution */}
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Tag className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Cobrança</span>
            </div>
            <div className="flex gap-1">
              {Object.entries(stats.billingDist).slice(0, 3).map(([type, count]) => (
                <span key={type} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {type === "one_time" ? "Único" : type === "recurring" ? "Rec." : type}: {count}
                </span>
              ))}
            </div>
          </Card>

          {/* Type distribution */}
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Image className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Tipos</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(stats.typeDist).slice(0, 3).map(([type, count]) => (
                <span key={type} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {type === "simple" ? "Simples" : type === "recurring" ? "Rec." : type === "composite" ? "Bundle" : type}: {count}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
