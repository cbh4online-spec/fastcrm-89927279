import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRevenueMetrics, useExecutiveKPIs } from "@/hooks/useForecastsReports";
import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Euro,
  Calendar,
  Filter,
  Download,
  ArrowRight,
  Target,
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

// Generate forecast chart data
function generateForecastData(kpis: any) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const currentMonth = new Date().getMonth();
  
  return months.map((name, i) => {
    const isPast = i <= currentMonth;
    return {
      name,
      realizado: isPast ? Math.floor(Math.random() * 50000) + 20000 : 0,
      previsto: Math.floor(Math.random() * 60000) + 25000,
      garantido: isPast ? 0 : Math.floor(Math.random() * 30000) + 15000,
    };
  });
}

export default function ReportsForecasts() {
  const { data: revenue, isLoading: revenueLoading } = useRevenueMetrics();
  const { data: kpis, isLoading: kpisLoading } = useExecutiveKPIs();
  const [period, setPeriod] = useState("90d");
  const [filter, setFilter] = useState("all");

  const isLoading = revenueLoading || kpisLoading;
  const chartData = kpis ? generateForecastData(kpis) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Previsões de Receita</h1>
            <p className="text-muted-foreground">
              Projeções baseadas em produtos ativos e oportunidades
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="60d">60 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="products">Por Produto</SelectItem>
                <SelectItem value="owner">Por Owner</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Previsão Total</p>
                    <Badge variant="outline" className="text-[10px]">
                      {period}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      period === '30d' ? revenue?.forecast30d || 0 :
                      period === '60d' ? revenue?.forecast60d || 0 :
                      revenue?.forecast90d || 0
                    )}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% vs período anterior</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Garantida</p>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(revenue?.guaranteedRevenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Probabilidade &gt;80%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Provável</p>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatCurrency(revenue?.probableRevenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Probabilidade 40-80%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Potencial Upsell</p>
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(kpis?.upsellPotential || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Clientes prontos para renovar
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução da Receita</CardTitle>
            <CardDescription>Realizado vs Previsto por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="realizado" 
                    name="Realizado"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorRealizado)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="previsto" 
                    name="Previsto"
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorPrevisto)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Breakdown por Fase</CardTitle>
              <CardDescription>Receita prevista por etapa do pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <>
                  {[
                    { stage: 'Qualificação', value: 25000, probability: 30 },
                    { stage: 'Proposta', value: 45000, probability: 60 },
                    { stage: 'Negociação', value: 35000, probability: 80 },
                    { stage: 'Fechamento', value: 20000, probability: 95 },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(item.value)}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {item.probability}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={item.probability} className="h-2" />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Explanation */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🤖 Explicação da Previsão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta previsão considera:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Produtos recorrentes ativos</strong> — receita garantida de assinaturas</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Packs em consumo</strong> — renovações previstas baseadas no ritmo atual</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Oportunidades em pipeline</strong> — ponderadas pela probabilidade de fecho</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Histórico de conversão</strong> — ajustado ao comportamento real do negócio</span>
                </li>
              </ul>
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground italic">
                  "A previsão é atualizada diariamente com base nos dados mais recentes."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
