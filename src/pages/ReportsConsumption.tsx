import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { useConsumptionForecast, useProductConsumption } from "@/hooks/useForecastsReports";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Users,
  Package,
  Activity,
  Clock,
  RefreshCw,
  Gauge,
  Target,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type ActiveTab = "forecast" | "products";

export default function ReportsConsumption() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("forecast");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: forecast, isLoading: forecastLoading } = useConsumptionForecast();
  const { data: products, isLoading: productsLoading } = useProductConsumption();

  const isLoading = forecastLoading || productsLoading;

  // Stats calculation
  const stats = useMemo(() => {
    const forecastData = forecast || [];
    const productsData = products || [];

    const totalSessions = forecastData.reduce((sum, w) => sum + w.expectedSessions, 0);
    const avgUtilization = forecastData.length > 0
      ? forecastData.reduce((sum, w) => sum + w.utilizationRate, 0) / forecastData.length
      : 0;
    const capacityAlerts = forecastData.filter(w => w.utilizationRate > 100).length;
    const avgConsumptionRate = productsData.length > 0
      ? productsData.reduce((sum, p) => sum + p.consumptionRate, 0) / productsData.length
      : 0;

    return {
      totalSessions,
      avgUtilization,
      capacityAlerts,
      totalProducts: productsData.length,
      avgConsumptionRate,
    };
  }, [forecast, products]);

  // Capacity alert
  const capacityAlert = forecast?.find(w => w.utilizationRate > 100);

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchValue.trim()) return products;
    
    const query = searchValue.toLowerCase();
    return products.filter(p => 
      p.productName.toLowerCase().includes(query)
    );
  }, [products, searchValue]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["consumption-forecast"] }),
      queryClient.invalidateQueries({ queryKey: ["product-consumption"] }),
    ]);
    setIsRefreshing(false);
  }, [queryClient]);

  // Tabs
  const pageTabs = [
    { id: "forecast", label: "Previsão", icon: <Calendar className="h-4 w-4" />, count: forecast?.length || 0 },
    { id: "products", label: "Produtos", icon: <Package className="h-4 w-4" />, count: products?.length || 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Page Header */}
        <PageHeader
          title="Consumo & Capacidade"
          count={stats.totalProducts}
          description="Previsão de sessões e planeamento de recursos"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sessões Previstas</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Próximas 4 semanas</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Utilização Média</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.avgUtilization.toFixed(0)}%</p>
                  )}
                </div>
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  stats.avgUtilization > 100 ? "bg-destructive/10" : 
                  stats.avgUtilization > 80 ? "bg-amber-500/10" : "bg-green-500/10"
                )}>
                  <Gauge className={cn(
                    "h-5 w-5",
                    stats.avgUtilization > 100 ? "text-destructive" : 
                    stats.avgUtilization > 80 ? "text-amber-500" : "text-green-500"
                  )} />
                </div>
              </div>
              <Progress 
                value={Math.min(stats.avgUtilization, 100)} 
                className="h-1.5 mt-2"
              />
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alertas Capacidade</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.capacityAlerts}</p>
                  )}
                </div>
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  stats.capacityAlerts > 0 ? "bg-destructive/10" : "bg-muted"
                )}>
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    stats.capacityAlerts > 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.capacityAlerts > 0 ? "Requer atenção" : "Tudo em ordem"}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Consumo</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.avgConsumptionRate.toFixed(0)}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Média por produto</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder={activeTab === "forecast" ? "Pesquisar semana..." : "Pesquisar produto..."}
          onSearchChange={setSearchValue}
          rightActions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          }
          showFilters={false}
        />

        {/* Capacity Alert */}
        {capacityAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alerta de Capacidade</AlertTitle>
            <AlertDescription>
              {capacityAlert.period}: Esperadas {capacityAlert.expectedSessions} sessões, 
              mas a capacidade disponível é de {capacityAlert.capacityAvailable}.
            </AlertDescription>
          </Alert>
        )}

        {/* Tab Content */}
        {activeTab === "forecast" ? (
          <div className="space-y-6">
            {/* Forecast Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[140px]" />
                ))
              ) : (
                forecast?.map((week, i) => (
                  <Card 
                    key={i}
                    className={cn(
                      "hover:shadow-md transition-all",
                      week.utilizationRate > 100 && "border-destructive/50 bg-destructive/5",
                      week.utilizationRate > 80 && week.utilizationRate <= 100 && "border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">{week.period}</p>
                        <Badge 
                          variant={week.utilizationRate > 100 ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {week.utilizationRate.toFixed(0)}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sessões</span>
                          <span className="font-medium">{week.expectedSessions}</span>
                        </div>
                        <Progress 
                          value={Math.min(week.utilizationRate, 100)} 
                          className={cn(
                            "h-2",
                            week.utilizationRate > 100 && "[&>div]:bg-destructive",
                            week.utilizationRate > 80 && week.utilizationRate <= 100 && "[&>div]:bg-amber-500"
                          )}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Capacidade: {week.capacityAvailable}</span>
                          {week.utilizationRate > 100 && (
                            <span className="text-destructive font-medium">
                              +{week.expectedSessions - week.capacityAvailable} excesso
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Previsão de Sessões por Semana
                </CardTitle>
                <CardDescription>Sessões esperadas vs capacidade disponível</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="period" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="expectedSessions" name="Sessões Esperadas" radius={[4, 4, 0, 0]}>
                        {forecast?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={
                              entry.utilizationRate > 100 
                                ? 'hsl(var(--destructive))' 
                                : entry.utilizationRate > 80 
                                  ? 'hsl(40, 90%, 50%)' 
                                  : 'hsl(var(--primary))'
                            }
                          />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="capacityAvailable" 
                        name="Capacidade" 
                        fill="hsl(var(--muted-foreground))"
                        opacity={0.3}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Consumption */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Consumo por Produto
                </CardTitle>
                <CardDescription>Análise de consumo de cada produto ativo</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : filteredProducts && filteredProducts.length > 0 ? (
                  <div className="space-y-4">
                    {filteredProducts.map((product, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">{product.productName}</p>
                            <span className="text-sm text-muted-foreground">
                              {product.totalConsumed}/{product.totalPurchased}
                            </span>
                          </div>
                          <Progress 
                            value={product.consumptionRate} 
                            className="h-2"
                          />
                          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                            <span>{product.consumptionRate.toFixed(0)}% consumido</span>
                            <span>Média: {product.avgConsumptionPerClient.toFixed(1)}/cliente</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchValue ? "Nenhum produto encontrado" : "Sem dados de consumo"}
                    </p>
                    <p className="text-xs mt-1">
                      {searchValue 
                        ? "Tente uma pesquisa diferente" 
                        : "Os dados aparecem quando clientes têm produtos ativos"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tips Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Como interpretar estes dados</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Verde</strong>: Capacidade adequada para a procura</li>
                  <li>• <strong>Amarelo</strong>: Perto do limite (80-100%)</li>
                  <li>• <strong>Vermelho</strong>: Capacidade excedida - considere reforço</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  As previsões são baseadas na frequência recomendada e no histórico de consumo real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
