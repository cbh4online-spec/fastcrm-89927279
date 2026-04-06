import { Check, Sparkles } from "lucide-react";

interface StoreProductHighlightsProps {
  benefits?: string[];
  shortDescription?: string | null;
  specs?: Record<string, string>;
  maxItems?: number;
}

/**
 * Secção "Sobre este produto" (estilo Amazon).
 * Mostra os benefícios principais + specs mais relevantes como bullet points.
 */
export function StoreProductHighlights({
  benefits,
  shortDescription,
  specs,
  maxItems = 5,
}: StoreProductHighlightsProps) {
  const highlights: string[] = [];

  // 1. Usar benefits existentes (prioridade máxima)
  if (benefits && benefits.length > 0) {
    highlights.push(...benefits.slice(0, maxItems));
  }

  // 2. Se não há benefits suficientes, extrair de specs-chave
  if (highlights.length < maxItems && specs) {
    const priorityKeys = ["marca", "brand", "proteção", "protection", "ip", "connectivity", "conectividade", "resolution", "resolução"];
    for (const key of priorityKeys) {
      if (highlights.length >= maxItems) break;
      const val = specs[key] || specs[key.toLowerCase()];
      if (val && val.trim()) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        highlights.push(`${label}: ${val}`);
      }
    }
  }

  // 3. Fallback: usar short_description como ponto único
  if (highlights.length === 0 && shortDescription) {
    highlights.push(shortDescription);
  }

  if (highlights.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Sobre este produto</h3>
      </div>
      <ul className="space-y-2">
        {highlights.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
