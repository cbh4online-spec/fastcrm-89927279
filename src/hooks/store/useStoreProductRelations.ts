import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  classifyRelationIntent,
  isRelationAvailable,
  isRelationType,
  type RelationIntent,
  type RelationType,
} from "@/lib/ai-commerce/relationIntent";

/**
 * Relações comerciais aprovadas de um produto, para a ficha pública.
 *
 * Regras não negociáveis:
 * - Fonte única: `product_relations` validadas no back-office (is_active + validação aceite).
 * - Preço, moeda, imagem e stock vêm sempre do produto real — nada é estimado.
 * - Só entram produtos publicados e ativos na loja.
 * - Agrupamento com intenção comercial explícita: complementos (cross-sell),
 *   upgrades (up-sell) e alternativas (down-sell / equivalentes).
 */

export interface StoreRelationItem {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  currency: string;
  image?: string;
  sku?: string;
  relationType: RelationType;
  intent: RelationIntent;
  /** Diferença de preço face ao produto principal (positivo = mais caro). */
  priceDelta: number | null;
  /** Etiqueta de compatibilidade/justificação, quando existe na relação. */
  reason?: string | null;
  available: boolean;
}

export interface StoreProductRelationGroups {
  /** Somam-se ao produto principal: acessórios, obrigatórios, packs, compatíveis. */
  essentials: StoreRelationItem[];
  /** Gama superior (up-sell). */
  upgrades: StoreRelationItem[];
  /** Opções mais acessíveis ou equivalentes (down-sell — nunca perder a venda). */
  alternatives: StoreRelationItem[];
  hasRelations: boolean;
}

const REJECTED_VALIDATION = new Set(["pending", "rejected"]);

const ESSENTIAL_TYPES: RelationType[] = ["required", "accessory", "bundle", "compatible"];

const PRODUCT_FIELDS =
  "id, name, store_slug, base_price, currency, images, primary_image_index, sku, status, store_published, stock_status, track_stock, stock_quantity, stock_reserved";

type RawProduct = Record<string, any>;

function resolveImage(p: RawProduct): string | undefined {
  const images: string[] | null = p.images ?? null;
  if (!images?.length) return undefined;
  const idx = typeof p.primary_image_index === "number" ? p.primary_image_index : 0;
  return images[idx] || images[0] || undefined;
}

function availableQuantity(p: RawProduct): number | null {
  if (!p.track_stock) return null;
  const qty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
  const reserved = typeof p.stock_reserved === "number" ? p.stock_reserved : 0;
  return Math.max(0, qty - reserved);
}

function toFacts(p: RawProduct) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.base_price ?? 0),
    status: p.status ?? null,
    stockStatus: p.stock_status ?? null,
    trackStock: p.track_stock ?? null,
    stockQuantity: availableQuantity(p),
    storePublished: p.store_published ?? null,
  };
}

const EMPTY: StoreProductRelationGroups = {
  essentials: [],
  upgrades: [],
  alternatives: [],
  hasRelations: false,
};

export function useStoreProductRelations(params: {
  productId: string | undefined;
  workspaceId: string | undefined;
  sourcePrice?: number | null;
  /** Limite por grupo. */
  limit?: number;
}) {
  const { productId, workspaceId, sourcePrice = null, limit = 6 } = params;

  const query = useQuery<StoreProductRelationGroups>({
    queryKey: ["store-product-relations", workspaceId, productId, sourcePrice, limit],
    enabled: !!productId && !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: relations, error } = await supabase
        .from("product_relations")
        .select(
          "target_product_id, relation_type, commercial_intent, validation_status, sort_order, reason",
        )
        .eq("source_product_id", productId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;

      const approved = (relations || []).filter(
        (r: RawProduct) =>
          isRelationType(r.relation_type) &&
          r.target_product_id !== productId &&
          !REJECTED_VALIDATION.has(String(r.validation_status || "").toLowerCase()),
      );
      if (approved.length === 0) return EMPTY;

      const targetIds = Array.from(
        new Set(approved.map((r: RawProduct) => r.target_product_id as string)),
      );

      const { data: targets } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .in("id", targetIds)
        .eq("store_published", true)
        .eq("status", "active");

      const byId = new Map<string, RawProduct>((targets || []).map((p: RawProduct) => [p.id, p]));

      const base = typeof sourcePrice === "number" && sourcePrice > 0 ? sourcePrice : null;
      const seen = new Set<string>();
      const items: StoreRelationItem[] = [];

      for (const r of approved) {
        const target = byId.get(r.target_product_id);
        if (!target || seen.has(target.id)) continue;
        seen.add(target.id);

        const relationType = r.relation_type as RelationType;
        const price = Number(target.base_price ?? 0);
        const intent = (r.commercial_intent ||
          classifyRelationIntent(relationType, base, price)) as RelationIntent;

        items.push({
          id: target.id,
          name: target.name,
          slug: target.store_slug ?? null,
          price,
          currency: target.currency || "EUR",
          image: resolveImage(target),
          sku: target.sku || undefined,
          relationType,
          intent,
          priceDelta: base ? Number((price - base).toFixed(2)) : null,
          reason: r.reason ?? null,
          available: isRelationAvailable(toFacts(target), { requireStorePublished: true }),
        });
      }

      // Disponíveis primeiro — nunca mostrar esgotados à frente de vendáveis.
      const sellableFirst = (a: StoreRelationItem, b: StoreRelationItem) =>
        Number(b.available) - Number(a.available);

      const essentials = items
        .filter((i) => ESSENTIAL_TYPES.includes(i.relationType))
        .sort((a, b) => sellableFirst(a, b) || a.price - b.price)
        .slice(0, limit);

      const usedIds = new Set(essentials.map((i) => i.id));

      const upgrades = items
        .filter((i) => !usedIds.has(i.id))
        .filter(
          (i) =>
            i.relationType === "upgrade" ||
            (i.intent === "upsell" && (i.relationType === "alternative" || i.relationType === "related")),
        )
        .sort((a, b) => sellableFirst(a, b) || a.price - b.price)
        .slice(0, limit);

      upgrades.forEach((i) => usedIds.add(i.id));

      const alternatives = items
        .filter((i) => !usedIds.has(i.id))
        .filter((i) => i.relationType === "alternative" || i.relationType === "related")
        .sort((a, b) => {
          const byStock = sellableFirst(a, b);
          if (byStock) return byStock;
          // Down-sell primeiro, do mais próximo do preço original para baixo.
          const da = a.intent === "downsell" ? 0 : 1;
          const db = b.intent === "downsell" ? 0 : 1;
          if (da !== db) return da - db;
          return b.price - a.price;
        })
        .slice(0, limit);

      return {
        essentials,
        upgrades,
        alternatives,
        hasRelations: essentials.length + upgrades.length + alternatives.length > 0,
      };
    },
  });

  return {
    ...(query.data ?? EMPTY),
    isLoading: query.isLoading,
  };
}
