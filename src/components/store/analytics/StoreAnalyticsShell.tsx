import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { StoreCartsTab } from "@/components/store/StoreCartsTab";
import { useStoreAnalytics } from "@/hooks/useStoreAnalytics";
import {
  BarChart3, DollarSign, Package, Users, Tag,
  ShoppingCart, Layers, CalendarIcon,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

import { StoreOverviewTab } from "./StoreOverviewTab";
import { StoreSalesTab } from "./StoreSalesTab";
import { StoreProductsTab } from "./StoreProductsTab";
import { StoreCustomersTab } from "./StoreCustomersTab";
import { StoreCouponsTab } from "./StoreCouponsTab";
import { StoreInventoryTab } from "./StoreInventoryTab";
import { StoreFinancialTab } from "./StoreFinancialTab";

export function StoreAnalyticsShell() {
  const [period, setPeriod] = useState(30);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCustom, setIsCustom] = useState(false);

  const effectiveDays = isCustom && customRange.from && customRange.to
    ? differenceInDays(customRange.to, customRange.from) + 1
    : period;

  const {
    kpis, dailyRevenue, topProducts, recentOrders,
    customerMetrics, couponMetrics, salesHeatmap,
    inventoryAlerts, statusBreakdown,
    customerLTV, bundleRevenue, checkoutFunnel,
  } = useStoreAnalytics(effectiveDays);

  const kpiData = kpis.data;
  const isLoading = kpis.isLoading;

  const handlePeriodChange = (v: string) => {
    if (v === "custom") {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setPeriod(Number(v));
    }
  };

  const periodLabel = isCustom && customRange.from && customRange.to
    ? `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics da Loja
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Painel completo de desempenho e vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={isCustom ? "custom" : String(period)} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>{periodLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="custom">Período personalizado</SelectItem>
            </SelectContent>
          </Select>

          {isCustom && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customRange.from && customRange.to
                    ? `${format(customRange.from, "dd/MM/yy")} → ${format(customRange.to, "dd/MM/yy")}`
                    : "Selecionar datas"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange.from && customRange.to ? { from: customRange.from, to: customRange.to } : undefined}
                  onSelect={(range) => {
                    if (range?.from) setCustomRange({ from: range.from, to: range.to });
                  }}
                  numberOfMonths={2}
                  locale={pt}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5" /> Vendas
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5 text-xs sm:text-sm">
            <Tag className="h-3.5 w-3.5" /> Cupões
          </TabsTrigger>
          <TabsTrigger value="carts" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="h-3.5 w-3.5" /> Carrinhos
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5" /> Inventário
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5" /> Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <StoreOverviewTab kpiData={kpiData} isLoading={isLoading} dailyRevenue={dailyRevenue} topProducts={topProducts} recentOrders={recentOrders} />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 mt-6">
          <StoreSalesTab statusBreakdown={statusBreakdown} salesHeatmap={salesHeatmap} />
        </TabsContent>

        <TabsContent value="products" className="space-y-6 mt-6">
          <StoreProductsTab topProducts={topProducts} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6 mt-6">
          <StoreCustomersTab customerMetrics={customerMetrics} />
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6 mt-6">
          <StoreCouponsTab couponMetrics={couponMetrics} />
        </TabsContent>

        <TabsContent value="carts">
          <StoreCartsTab />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <StoreInventoryTab inventoryAlerts={inventoryAlerts} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 mt-6">
          <StoreFinancialTab checkoutFunnel={checkoutFunnel} customerLTV={customerLTV} bundleRevenue={bundleRevenue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
