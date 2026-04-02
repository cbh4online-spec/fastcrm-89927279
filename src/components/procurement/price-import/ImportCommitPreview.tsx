import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Plus, RefreshCw, AlertTriangle } from "lucide-react";

interface ImportCommitPreviewProps {
  stats: { total: number; matched: number; unmatched: number; errors: number; duplicates: number } | null;
}

export function ImportCommitPreview({ stats }: ImportCommitPreviewProps) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Impacto da Importação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Revise o impacto antes de confirmar. Apenas linhas com match serão importadas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.matched}</p>
            <p className="text-xs text-muted-foreground">Links a atualizar/criar</p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de linhas</p>
          </div>

          <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-2xl font-bold text-yellow-700">{stats.unmatched}</p>
            <p className="text-xs text-muted-foreground">Ignoradas (sem match)</p>
          </div>

          <div className="text-center p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas (erros)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
