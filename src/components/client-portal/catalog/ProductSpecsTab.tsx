import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Pill, Ruler, Truck, Boxes } from "lucide-react";

interface ProductSpecsTabProps {
  specifications: Record<string, unknown> | null;
  weightNet: number | null;
  weightGross: number | null;
  volumeValue: number | null;
  volumeUnit: string | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  packageType: string | null;
  barcode: string | null;
  minOrderQuantity: number | null;
  orderMultiple: number | null;
  deliveryEstimate: string | null;
  stockStatus: string | null;
}

function asArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim()) as string[];
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

const STOCK_LABEL: Record<string, { label: string; tone: string }> = {
  available: { label: "Disponível", tone: "bg-green-100 text-green-700 border-green-200" },
  limited: { label: "Stock limitado", tone: "bg-amber-100 text-amber-700 border-amber-200" },
  backorder: { label: "Sob encomenda", tone: "bg-blue-100 text-blue-700 border-blue-200" },
  out_of_stock: { label: "Esgotado", tone: "bg-red-100 text-red-700 border-red-200" },
};

export function ProductSpecsTab({
  specifications,
  weightNet,
  weightGross,
  volumeValue,
  volumeUnit,
  lengthCm,
  widthCm,
  heightCm,
  packageType,
  barcode,
  minOrderQuantity,
  orderMultiple,
  deliveryEstimate,
  stockStatus,
}: ProductSpecsTabProps) {
  const specs = specifications || {};
  const composition = asArray((specs as any).composition);
  const ingredients = asArray((specs as any).active_ingredients);
  const allActives = [...composition, ...ingredients];

  // Other specs as key/value table (excluding ones already rendered)
  const handledKeys = new Set([
    "composition",
    "active_ingredients",
    "usage",
    "modo_uso",
    "how_to_use",
    "expected_results",
    "resultados",
    "duration",
    "duracao",
    "contraindications",
    "contraindicacoes",
    "storage",
    "conservacao",
  ]);
  const extraSpecs = Object.entries(specs).filter(
    ([k, v]) =>
      !handledKeys.has(k) &&
      v != null &&
      (typeof v === "string" || typeof v === "number") &&
      String(v).trim().length > 0,
  );

  const hasDimensions = weightNet || weightGross || volumeValue || lengthCm || widthCm || heightCm || packageType;
  const hasOps = minOrderQuantity || orderMultiple || deliveryEstimate || stockStatus;
  const hasContent =
    allActives.length > 0 || extraSpecs.length > 0 || hasDimensions || hasOps || barcode;

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sem especificações técnicas disponíveis.
      </div>
    );
  }

  const dims = [lengthCm, widthCm, heightCm].filter(Boolean);
  const stock = stockStatus ? STOCK_LABEL[stockStatus] : null;

  return (
    <div className="space-y-6">
      {/* Composição / Ativos */}
      {allActives.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Composição / Ativos
          </h4>
          <div className="flex flex-wrap gap-2">
            {allActives.map((item, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                <Pill className="h-3 w-3 mr-1" />
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Dimensões / Peso */}
      {hasDimensions && (
        <>
          {allActives.length > 0 && <Separator />}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              Dimensões e embalagem
            </h4>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              {weightNet && (
                <div>
                  <dt className="text-xs text-muted-foreground">Peso líquido</dt>
                  <dd className="font-medium">{weightNet} kg</dd>
                </div>
              )}
              {weightGross && (
                <div>
                  <dt className="text-xs text-muted-foreground">Peso bruto</dt>
                  <dd className="font-medium">{weightGross} kg</dd>
                </div>
              )}
              {volumeValue && (
                <div>
                  <dt className="text-xs text-muted-foreground">Volume</dt>
                  <dd className="font-medium">
                    {volumeValue} {volumeUnit || ""}
                  </dd>
                </div>
              )}
              {dims.length > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground">Dimensões (CxLxA)</dt>
                  <dd className="font-medium">
                    {dims.map((d) => `${d}`).join(" × ")} cm
                  </dd>
                </div>
              )}
              {packageType && (
                <div>
                  <dt className="text-xs text-muted-foreground">Tipo de embalagem</dt>
                  <dd className="font-medium">{packageType}</dd>
                </div>
              )}
              {barcode && (
                <div>
                  <dt className="text-xs text-muted-foreground">Código de barras</dt>
                  <dd className="font-mono text-xs">{barcode}</dd>
                </div>
              )}
            </dl>
          </div>
        </>
      )}

      {/* Operacional B2B */}
      {hasOps && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Logística e disponibilidade
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {stock && (
                <Badge variant="outline" className={stock.tone}>
                  {stock.label}
                </Badge>
              )}
              {deliveryEstimate && (
                <Badge variant="outline" className="bg-muted/60">
                  <Truck className="h-3 w-3 mr-1" />
                  Entrega: {deliveryEstimate}
                </Badge>
              )}
              {minOrderQuantity && minOrderQuantity > 1 && (
                <Badge variant="outline" className="bg-muted/60">
                  <Boxes className="h-3 w-3 mr-1" />
                  Mín.: {minOrderQuantity}
                </Badge>
              )}
              {orderMultiple && orderMultiple > 1 && (
                <Badge variant="outline" className="bg-muted/60">
                  Múltiplos de {orderMultiple}
                </Badge>
              )}
            </div>
          </div>
        </>
      )}

      {/* Outras specs JSONB */}
      {extraSpecs.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3">Outras especificações</h4>
            <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {extraSpecs.map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="font-medium">{String(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
