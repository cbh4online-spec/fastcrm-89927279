import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Copy } from "lucide-react";

interface ImportQualityGateProps {
  totalRows: number;
  parseErrors: number;
  stats: { total: number; matched: number; unmatched: number; errors: number; duplicates: number } | null;
}

export function ImportQualityGate({ totalRows, parseErrors, stats }: ImportQualityGateProps) {
  const matchRate = stats && stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0;
  const hasIssues = (stats?.errors ?? 0) > 0 || (stats?.duplicates ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Quality Gate
          {!hasIssues && stats && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          {hasIssues && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalRows}</p>
            <p className="text-xs text-muted-foreground">Total de Linhas</p>
          </div>

          {stats && (
            <>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{stats.matched}</p>
                <p className="text-xs text-muted-foreground">Matched ({matchRate}%)</p>
              </div>

              <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{stats.unmatched}</p>
                <p className="text-xs text-muted-foreground">Sem Match</p>
              </div>

              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </>
          )}

          {!stats && parseErrors > 0 && (
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{parseErrors}</p>
              <p className="text-xs text-muted-foreground">Erros de Parse</p>
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.matched > 0 && <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> {stats.matched} matched
            </Badge>}
            {stats.unmatched > 0 && <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" /> {stats.unmatched} sem match
            </Badge>}
            {stats.errors > 0 && <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" /> {stats.errors} erros
            </Badge>}
            {stats.duplicates > 0 && <Badge variant="outline">
              <Copy className="h-3 w-3 mr-1" /> {stats.duplicates} duplicados
            </Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
