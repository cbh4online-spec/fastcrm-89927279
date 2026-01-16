import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Users,
  Zap,
  Clock,
  DollarSign,
  Target,
  Activity,
  ArrowDown,
} from "lucide-react";
import { useTrialConversionMetrics } from "@/hooks/useTrialConversionMetrics";
import { cn } from "@/lib/utils";

export function ConversionMetricsDashboard() {
  const { data: metrics, isLoading } = useTrialConversionMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Sem dados de conversão disponíveis
      </div>
    );
  }

  const { overview, byModule, funnel } = metrics;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trials Iniciados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_trials_started}</div>
            <p className="text-xs text-muted-foreground">
              Total de trials em progresso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.conversion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.converted_to_paid} conversões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uso Médio Trial</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.avg_trial_usage_percent.toFixed(0)}%
            </div>
            <Progress value={overview.avg_trial_usage_percent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Poupado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.time_saved_hours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              ≈ €{(overview.time_saved_hours * 25).toFixed(0)} de valor
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Funil de Conversão</TabsTrigger>
          <TabsTrigger value="modules">Por Módulo</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Trial → Pago</CardTitle>
              <CardDescription>
                Acompanha a progressão dos utilizadores através do trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel.map((stage, index) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <ArrowDown className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{stage.stage}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{stage.count}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({stage.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={stage.percentage} 
                      className={cn(
                        "h-3",
                        index === funnel.length - 1 && "[&>div]:bg-green-500"
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Módulo</CardTitle>
              <CardDescription>
                Métricas detalhadas de cada módulo do marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Trials</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Uso Médio</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModule.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Sem dados de módulos
                      </TableCell>
                    </TableRow>
                  ) : (
                    byModule.map((module) => (
                      <TableRow key={module.module_id}>
                        <TableCell className="font-medium">
                          {module.module_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {module.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {module.trials_started}
                        </TableCell>
                        <TableCell className="text-right">
                          {module.conversions}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            module.conversion_rate >= 20 && "text-green-600",
                            module.conversion_rate < 10 && "text-red-600"
                          )}>
                            {module.conversion_rate.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress 
                              value={module.avg_usage_percent} 
                              className="w-16 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {module.avg_usage_percent.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          €{module.revenue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
