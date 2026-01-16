import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useConsumptionForecast, useProductConsumption } from "@/hooks/useForecastsReports";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Users,
  Package,
  Activity,
  Clock
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

export default function ReportsConsumption() {
  const { data: forecast, isLoading: forecastLoading } = useConsumptionForecast();
  const { data: products, isLoading: productsLoading } = useProductConsumption();

  const isLoading = forecastLoading || productsLoading;

  // Check for capacity issues
  const capacityAlert = forecast?.find(w => w.utilizationRate > 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Consumo & Capacidade</h1>
          <p className="text-muted-foreground">
            Previsão de sessões e planeamento de recursos
          </p>
        </div>

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
                  week.utilizationRate > 100 && "border-red-300 bg-red-50/50",
                  week.utilizationRate > 80 && week.utilizationRate <= 100 && "border-amber-300 bg-amber-50/50"
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
                        week.utilizationRate > 100 && "[&>div]:bg-red-500",
                        week.utilizationRate > 80 && week.utilizationRate <= 100 && "[&>div]:bg-amber-500"
                      )}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Capacidade: {week.capacityAvailable}</span>
                      {week.utilizationRate > 100 && (
                        <span className="text-red-600 font-medium">
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

        {/* Product Consumption Table */}
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
            ) : products && products.length > 0 ? (
              <div className="space-y-4">
                {products.slice(0, 6).map((product, i) => (
                  <div key={i} className="flex items-center gap-4">
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
                <p className="text-sm">Sem dados de consumo</p>
                <p className="text-xs mt-1">
                  Os dados aparecem quando clientes têm produtos ativos
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
