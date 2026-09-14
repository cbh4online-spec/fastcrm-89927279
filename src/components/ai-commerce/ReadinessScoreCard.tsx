import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { readinessBand } from "@/lib/ai-commerce/readiness";
import type { ReadinessResult } from "@/lib/ai-commerce/types";

const BAND_LABEL: Record<string, string> = {
  critical: "Crítico",
  low: "Insuficiente",
  good: "Bom",
  excellent: "Excelente",
};

interface Props {
  readiness: ReadinessResult;
  onFix?: (code: string, target: "product" | "ai" | "feed") => void;
  compact?: boolean;
}

export function ReadinessScoreCard({ readiness, onFix, compact }: Props) {
  const band = readinessBand(readiness.score);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">AI Commerce Readiness</CardTitle>
            <p className="text-sm text-muted-foreground">
              {readiness.isReady
                ? "Pronto para canais de IA."
                : "Existem campos obrigatórios em falta."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {readiness.score}
              <span className="text-base text-muted-foreground"> / 100</span>
            </div>
            <Badge variant={band === "excellent" || band === "good" ? "default" : "destructive"}>
              {BAND_LABEL[band]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={readiness.score} aria-label={`Readiness ${readiness.score} de 100`} />

        {readiness.issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            Todos os critérios validados.
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Problemas encontrados">
            {(compact ? readiness.issues.slice(0, 5) : readiness.issues).map((issue) => (
              <li
                key={issue.code}
                className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={
                      issue.severity === "error"
                        ? "mt-0.5 h-4 w-4 text-destructive"
                        : "mt-0.5 h-4 w-4 text-muted-foreground"
                    }
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">{issue.label}</p>
                    <p className="text-xs text-muted-foreground">{issue.message}</p>
                  </div>
                </div>
                {onFix && (
                  <Button size="sm" variant="outline" onClick={() => onFix(issue.code, issue.target)}>
                    <Wrench className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Corrigir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {compact && readiness.issues.length > 5 && (
          <p className="text-xs text-muted-foreground">
            +{readiness.issues.length - 5} problemas adicionais.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
