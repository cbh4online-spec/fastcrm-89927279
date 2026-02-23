import { useDemandForecast } from "@/hooks/useDemandForecast";
import { useProductInventory } from "@/hooks/useProductInventory";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function B2BForecastPage() {
  const { currentWorkspace } = useWorkspace();
  const { forecasts, isLoading } = useDemandForecast(currentWorkspace?.id);
  const { inventory } = useProductInventory(currentWorkspace?.id);

  // Identify risk items: forecast > available stock
  const riskItems = forecasts.filter((f) => {
    const inv = inventory.find((i) => i.product_id === f.product_id);
    if (!inv) return false;
    return f.forecast_qty > (inv.stock_on_hand - inv.stock_reserved);
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Previsão de Procura
        </h1>
        <p className="text-muted-foreground">Previsão baseada em média móvel e planos recorrentes</p>
      </div>

      {/* Risk Alert */}
      {riskItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-200">
              {riskItems.length} produto(s) com previsão superior ao stock disponível
            </span>
          </CardContent>
        </Card>
      )}

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previsões por Produto</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Previsão (un.)</TableHead>
                <TableHead className="text-right">Confiança</TableHead>
                <TableHead className="text-right">Stock Disp.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Sem previsões geradas. Execute o job de previsão para calcular.
                  </TableCell>
                </TableRow>
              ) : (
                forecasts.map((f) => {
                  const inv = inventory.find((i) => i.product_id === f.product_id);
                  const available = inv ? inv.stock_on_hand - inv.stock_reserved : null;
                  const isRisk = available !== null && f.forecast_qty > available;
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <p className="font-medium">{f.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{f.product?.sku}</p>
                      </TableCell>
                      <TableCell>{format(new Date(f.period_month), "MMM yyyy", { locale: pt })}</TableCell>
                      <TableCell className="text-right font-medium">{f.forecast_qty}</TableCell>
                      <TableCell className="text-right">
                        {f.confidence ? `${Math.round(f.confidence * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{available ?? "—"}</TableCell>
                      <TableCell>
                        {isRisk ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Risco
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
