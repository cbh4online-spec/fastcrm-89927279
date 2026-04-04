import { useRevenueForecast, useGenerateRevenueForecast, formatCurrency } from "@/hooks/useRevenueForecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, RefreshCw, Loader2, AlertTriangle, Sparkles, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function AnalyzeTab() {
  const { latestForecast, trend, isLoading } = useRevenueForecast();
  const generateForecast = useGenerateRevenueForecast();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!latestForecast) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <div>
          <h3 className="font-semibold text-lg">Sem previsão disponível</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Para gerar previsões de receita com IA, é necessário ter oportunidades abertas no pipeline. 
            Crie a sua primeira oportunidade ou gere o forecast agora.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            onClick={() => generateForecast.mutate()}
            disabled={generateForecast.isPending}
            className="gap-2"
          >
            {generateForecast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Gerar Forecast
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/dashboard/pipeline")}
          >
            <PlusCircle className="h-4 w-4" />
            Ir para Pipeline
          </Button>
        </div>
      </div>
    );
  }

  const riskColor = latestForecast.risk_index > 70 ? "destructive" : latestForecast.risk_index > 40 ? "secondary" : "default";

  return (
    <div className="space-y-6">
      {/* Cenários de Receita */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Cenário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(latestForecast.best_case)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Esperado
              {trend !== null && (
                <Badge variant="outline" className={cn("text-xs", trend >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend > 0 ? "+" : ""}{trend}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(latestForecast.expected_case)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pior Cenário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(latestForecast.worst_case)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Pipeline (7 dias)</p>
            <p className="text-lg font-semibold">{formatCurrency(latestForecast.forecast_7)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Pipeline (30 dias)</p>
            <p className="text-lg font-semibold">{formatCurrency(latestForecast.forecast_30)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Oportunidades</p>
            <p className="text-lg font-semibold">{latestForecast.opportunity_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              Índice de Risco
              {latestForecast.risk_index > 60 && <AlertTriangle className="h-3 w-3 text-warning" />}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{latestForecast.risk_index}%</p>
              <Badge variant={riskColor} className="text-[10px]">
                {latestForecast.risk_index > 70 ? "Alto" : latestForecast.risk_index > 40 ? "Médio" : "Baixo"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Confiança */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Distribuição por Confiança</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateForecast.mutate()}
              disabled={generateForecast.isPending}
              className="gap-1.5"
            >
              {generateForecast.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Quentes", count: latestForecast.hot_count, color: "bg-emerald-500" },
              { label: "Prováveis", count: latestForecast.likely_count, color: "bg-primary" },
              { label: "Incertos", count: latestForecast.uncertain_count, color: "bg-warning" },
              { label: "Baixos", count: latestForecast.low_count, color: "bg-destructive" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={cn("w-3 h-3 rounded-full mx-auto mb-1.5", item.color)} />
                <p className="text-lg font-semibold">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
