import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, Trophy } from "lucide-react";

interface ScenarioData {
  id: string;
  title: string;
  outputs_json: Record<string, any>;
  delta_json: Record<string, any>;
  confidence: number;
}

interface Props {
  baseline: Record<string, any> | null;
  scenarios: ScenarioData[];
}

const METRIC_ROWS = [
  { key: "forecast_revenue_30d", label: "Receita 30d", format: "currency" },
  { key: "forecast_revenue_90d", label: "Receita 90d", format: "currency" },
  { key: "forecast_deals_30d", label: "Deals 30d", format: "number" },
  { key: "forecast_conversion_rate", label: "Conversão", format: "percent" },
  { key: "pipeline_coverage", label: "Pipeline Coverage", format: "ratio" },
  { key: "execution_capacity_score", label: "Capacidade Execução", format: "score" },
  { key: "risk_of_miss_target", label: "Risco", format: "risk" },
];

function formatValue(val: any, format: string) {
  if (val == null) return "—";
  switch (format) {
    case "currency": return `€${Number(val).toLocaleString("pt-PT")}`;
    case "percent": return `${Math.round(Number(val) * 100)}%`;
    case "ratio": return `${Number(val).toFixed(1)}x`;
    case "score": return `${val}/100`;
    case "risk": return String(val);
    default: return String(val);
  }
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (delta > 0) return <span className="flex items-center gap-0.5 text-green-600 text-xs font-medium"><ArrowUp className="h-3 w-3" />+{delta > 1000 ? `€${delta.toLocaleString("pt-PT")}` : delta}</span>;
  return <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium"><ArrowDown className="h-3 w-3" />{delta}</span>;
}

function getRiskColor(risk: string) {
  switch (risk) {
    case "low": return "bg-green-100 text-green-700";
    case "medium": return "bg-yellow-100 text-yellow-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "critical": return "bg-red-100 text-red-700";
    default: return "bg-muted text-muted-foreground";
  }
}

export function ScenarioComparisonTable({ baseline, scenarios }: Props) {
  if (!baseline && scenarios.length === 0) return null;

  // Find recommended: highest revenue delta + lowest risk
  const recommended = scenarios.length > 0
    ? scenarios.reduce((best, s) => {
        const sDelta = s.delta_json?.revenue_30d_delta ?? 0;
        const bDelta = best.delta_json?.revenue_30d_delta ?? 0;
        return sDelta > bDelta ? s : best;
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparação de Cenários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                <th className="text-right py-2 px-3 font-medium">Baseline</th>
                {scenarios.map((s) => (
                  <th key={s.id} className="text-right py-2 px-3 font-medium">
                    <div className="flex items-center justify-end gap-1">
                      {s.title}
                      {recommended?.id === s.id && (
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => (
                <tr key={row.key} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                  <td className="text-right py-2 px-3 font-mono">
                    {row.format === "risk" && baseline?.[row.key] ? (
                      <Badge variant="outline" className={getRiskColor(baseline[row.key])}>
                        {baseline[row.key]}
                      </Badge>
                    ) : (
                      formatValue(baseline?.[row.key], row.format)
                    )}
                  </td>
                  {scenarios.map((s) => {
                    const val = s.outputs_json?.[row.key];
                    const deltaKey = row.key.replace("forecast_", "").replace("_30d", "_30d_delta").replace("_90d", "_90d_delta");
                    const delta = s.delta_json?.[deltaKey];
                    return (
                      <td key={s.id} className="text-right py-2 px-3">
                        <div className="flex items-center justify-end gap-2">
                          {row.format === "risk" && val ? (
                            <Badge variant="outline" className={getRiskColor(val)}>
                              {val}
                            </Badge>
                          ) : (
                            <span className="font-mono">{formatValue(val, row.format)}</span>
                          )}
                          {delta != null && typeof delta === "number" && <DeltaIndicator delta={delta} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2">
                <td className="py-2 pr-4 font-medium">Confiança</td>
                <td className="text-right py-2 px-3 font-mono">—</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="text-right py-2 px-3 font-mono">
                    {Math.round((s.confidence || 0) * 100)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
