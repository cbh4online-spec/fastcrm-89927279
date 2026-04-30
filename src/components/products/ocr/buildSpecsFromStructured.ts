// Mapeia OCRStructuredData -> linhas para `product_spec_attributes`.
// Estratégia: cada campo informativo do OCR vira uma "spec" agrupada por tema,
// para que o utilizador veja toda a informação extraída no separador Specs
// (em vez de a perder no documento original).
import type { OCRStructuredData } from "./types";

export interface SpecRow {
  workspace_id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  unit: string | null;
  spec_group: string;
  display_order: number;
}

const TRUNC = (v: string, max = 1500) => (v.length > max ? v.slice(0, max - 1) + "…" : v);

const push = (
  out: SpecRow[],
  ws: string,
  pid: string,
  group: string,
  key: string,
  value: string | null | undefined,
  unit: string | null = null,
) => {
  const s = (value ?? "").toString().trim();
  if (!s) return;
  out.push({
    workspace_id: ws,
    product_id: pid,
    spec_key: key,
    spec_value: TRUNC(s),
    unit,
    spec_group: group,
    display_order: out.length,
  });
};

export function buildSpecsFromStructured(
  workspaceId: string,
  productId: string,
  s: OCRStructuredData | null | undefined,
): SpecRow[] {
  if (!s) return [];
  const out: SpecRow[] = [];

  // Identificação
  push(out, workspaceId, productId, "Identificação", "EAN", s.identification?.ean);
  push(out, workspaceId, productId, "Identificação", "SKU", s.identification?.sku);
  push(out, workspaceId, productId, "Identificação", "Volume", s.identification?.volume);
  push(out, workspaceId, productId, "Identificação", "Unidade", s.identification?.unit);
  push(out, workspaceId, productId, "Identificação", "País de origem", s.identification?.origin_country);
  push(out, workspaceId, productId, "Identificação", "Distribuidor", s.identification?.distributor);

  // Geral / categorização
  push(out, workspaceId, productId, "Geral", "Marca", s.general?.brand);
  push(out, workspaceId, productId, "Geral", "Linha", s.general?.product_line);
  push(out, workspaceId, productId, "Geral", "Categoria", s.general?.category);
  push(out, workspaceId, productId, "Geral", "Subcategoria", s.general?.subcategory);
  push(out, workspaceId, productId, "Geral", "Tipo", s.general?.product_type);

  // Composição
  push(out, workspaceId, productId, "Composição", "Ingredientes", s.composition?.ingredients);
  (s.composition?.claims ?? []).forEach((c, i) =>
    push(out, workspaceId, productId, "Composição", `Claim ${i + 1}`, c),
  );

  // Modo de utilização
  push(out, workspaceId, productId, "Utilização", "Instruções", s.usage?.instructions);
  push(out, workspaceId, productId, "Utilização", "Precauções", s.usage?.precautions);

  // Comercial / sensorial
  push(out, workspaceId, productId, "Comercial", "Posicionamento", s.commercial?.positioning);
  push(out, workspaceId, productId, "Comercial", "Cliente ideal", s.commercial?.ideal_customer);
  push(out, workspaceId, productId, "Comercial", "Notas sensoriais", s.commercial?.sensory_notes);
  push(out, workspaceId, productId, "Comercial", "Notas olfativas", s.commercial?.olfactory_notes);

  // Kit
  if (s.kit_info?.is_kit) {
    push(out, workspaceId, productId, "Kit", "É kit", "Sim");
    (s.kit_info?.kit_components_mentioned ?? []).forEach((c, i) =>
      push(out, workspaceId, productId, "Kit", `Componente ${i + 1}`, c),
    );
  }

  // Notas adicionais do OCR
  push(out, workspaceId, productId, "Notas", "Notas OCR", s.notes ?? null);

  return out;
}
