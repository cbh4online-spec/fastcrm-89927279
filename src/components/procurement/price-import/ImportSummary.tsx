import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Download, RefreshCw } from "lucide-react";

interface ImportSummaryProps {
  commitStats: { total_matched: number; updated: number; created: number; unchanged: number; errors: number } | null;
  onReset: () => void;
  onExportErrors?: () => void;
}

export function ImportSummary({ commitStats, onReset, onExportErrors }: ImportSummaryProps) {
  if (!commitStats) return null;

  const hasErrors = commitStats.errors > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resultado da Importação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            {hasErrors ? (
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            ) : (
              <Check className="h-8 w-8 text-primary" />
            )}
          </div>
          <h3 className="text-lg font-semibold">
            {hasErrors ? "Importação Concluída com Avisos" : "Importação Concluída!"}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
            <p className="text-2xl font-bold text-emerald-700">{commitStats.created}</p>
            <p className="text-xs text-muted-foreground">Novos</p>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{commitStats.updated}</p>
            <p className="text-xs text-muted-foreground">Atualizados</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{commitStats.unchanged}</p>
            <p className="text-xs text-muted-foreground">Sem alteração</p>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <p className="text-2xl font-bold text-destructive">{commitStats.errors}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={onReset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Nova Importação
          </Button>
          {hasErrors && onExportErrors && (
            <Button onClick={onExportErrors} variant="secondary">
              <Download className="h-4 w-4 mr-2" /> Exportar Erros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
