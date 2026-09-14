/**
 * Configuração do score de readiness por workspace.
 * Permite ajustar peso, severidade e ativação de cada critério, sem tocar no código.
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadinessConfig } from "@/hooks/useAICommerce";
import {
  READINESS_CATEGORY_LABELS,
  READINESS_CRITERIA_LABELS,
} from "@/lib/ai-commerce/readiness";
import type { ReadinessCategory, ReadinessSeverity } from "@/lib/ai-commerce/types";

export function AICommerceReadinessSettings() {
  const { data, isLoading, save } = useReadinessConfig();

  const overrides = useMemo(() => new Map((data || []).map((o) => [o.code, o])), [data]);

  const grouped = useMemo(() => {
    const map = new Map<ReadinessCategory, typeof READINESS_CRITERIA_LABELS>();
    for (const criterion of READINESS_CRITERIA_LABELS) {
      const list = map.get(criterion.category) || [];
      list.push(criterion);
      map.set(criterion.category, list);
    }
    return Array.from(map.entries());
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Os valores por omissão aplicam-se a todos os produtos. Qualquer alteração afeta apenas este espaço de
        trabalho e recalcula imediatamente as pontuações.
      </p>

      {grouped.map(([category, criteria]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{READINESS_CATEGORY_LABELS[category]}</CardTitle>
            <CardDescription>
              {criteria.length} {criteria.length === 1 ? "critério" : "critérios"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteria.map((criterion) => {
              const override = overrides.get(criterion.code);
              const enabled = override?.enabled !== false;
              const weight = override?.weight ?? criterion.weight;
              const severity: ReadinessSeverity = (override?.severity as ReadinessSeverity) ?? criterion.severity;

              return (
                <div
                  key={criterion.code}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{criterion.label}</span>
                      {override ? <Badge variant="secondary">Personalizado</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{criterion.code}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`weight-${criterion.code}`} className="text-xs text-muted-foreground">
                        Peso
                      </Label>
                      <Input
                        id={`weight-${criterion.code}`}
                        type="number"
                        min={0}
                        max={50}
                        className="w-20"
                        defaultValue={weight}
                        disabled={!enabled}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (Number.isNaN(next) || next < 0 || next > 50 || next === weight) return;
                          save.mutate({ code: criterion.code, weight: next, severity, enabled });
                        }}
                      />
                    </div>

                    <Select
                      value={severity}
                      disabled={!enabled}
                      onValueChange={(value) =>
                        save.mutate({
                          code: criterion.code,
                          weight,
                          severity: value as ReadinessSeverity,
                          enabled,
                        })
                      }
                    >
                      <SelectTrigger className="w-32" aria-label={`Severidade de ${criterion.label}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Bloqueante</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`enabled-${criterion.code}`}
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          save.mutate({ code: criterion.code, weight, severity, enabled: checked })
                        }
                        aria-label={`Ativar ${criterion.label}`}
                      />
                      <Label htmlFor={`enabled-${criterion.code}`} className="text-xs text-muted-foreground">
                        Ativo
                      </Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
