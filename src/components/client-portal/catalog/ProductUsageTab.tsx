import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Package, Target, AlertTriangle, Snowflake } from "lucide-react";

interface ProductUsageTabProps {
  recommendedFrequency: string | null;
  typicalDurationDays: number | null;
  packSize: number | null;
  unitName: string | null;
  includedQuantity: number | null;
  conditions: string | null;
  specifications: Record<string, unknown> | null;
}

function pickStr(specs: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = specs[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

export function ProductUsageTab({
  recommendedFrequency,
  typicalDurationDays,
  packSize,
  unitName,
  includedQuantity,
  conditions,
  specifications,
}: ProductUsageTabProps) {
  const specs = specifications || {};
  const usage = pickStr(specs, "usage", "modo_uso", "how_to_use");
  const expectedResults = pickStr(specs, "expected_results", "resultados");
  const duration = pickStr(specs, "duration", "duracao");
  const contraindications = pickStr(specs, "contraindications", "contraindicacoes");
  const storage = pickStr(specs, "storage", "conservacao");

  const hasFrequencyBlock =
    recommendedFrequency || typicalDurationDays || packSize || includedQuantity;
  const hasContent =
    hasFrequencyBlock || usage || expectedResults || duration || contraindications || storage || conditions;

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sem instruções de uso definidas para este produto.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frequency / Duration / Pack — quick KPI cards */}
      {hasFrequencyBlock && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recommendedFrequency && (
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" /> Frequência
              </div>
              <p className="text-sm font-semibold">{recommendedFrequency}</p>
            </div>
          )}
          {typicalDurationDays && (
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" /> Duração típica
              </div>
              <p className="text-sm font-semibold">{typicalDurationDays} dias</p>
            </div>
          )}
          {packSize && (
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Package className="h-3.5 w-3.5" /> Embalagem
              </div>
              <p className="text-sm font-semibold">
                {packSize} {unitName || "unid."}
              </p>
            </div>
          )}
          {includedQuantity && (
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Package className="h-3.5 w-3.5" /> Inclui
              </div>
              <p className="text-sm font-semibold">
                {includedQuantity} {unitName || "unid."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modo de Uso */}
      {usage && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Modo de Uso
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{usage}</p>
        </div>
      )}

      {/* Resultados esperados */}
      {expectedResults && (
        <>
          {usage && <Separator />}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Resultados Esperados
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {expectedResults}
            </p>
          </div>
        </>
      )}

      {/* Duração tratamento */}
      {duration && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Duração do Tratamento
            </h4>
            <p className="text-sm text-muted-foreground">{duration}</p>
          </div>
        </>
      )}

      {/* Contraindications — destaque amber */}
      {contraindications && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2 text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Contraindicações
          </h4>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{contraindications}</p>
        </div>
      )}

      {/* Storage */}
      {storage && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-primary" />
            Conservação
          </h4>
          <p className="text-sm text-muted-foreground">{storage}</p>
        </div>
      )}

      {/* Conditions */}
      {conditions && (
        <div className="bg-muted/40 border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide">
            Condições comerciais
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{conditions}</p>
        </div>
      )}
    </div>
  );
}
