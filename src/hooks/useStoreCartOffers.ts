import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  classifyRelationIntent,
  isRelationAvailable,
  isRelationType,
  rankRelationOffers,
  type RelationIntent,
  type RelationOffer,
  type RelationType,
} from "@/lib/ai-commerce/relationIntent";
import type { CartItem } from "@/stores/useStoreCartStore";

/**
 * Ofertas do carrinho / checkout alinhadas com o AI Commerce.
 *
 * Regras não negociáveis:
 * - Preço, IVA, stock e disponibilidade vêm sempre do produto real (base de dados).
 * - Só relações aprovadas (is_active + validation_status aceite) alimentam sugestões.
 * - Nunca perder a venda: se um artigo do carrinho deixou de estar disponível,
 *   apresentamos alternativas equivalentes reais (down-sell prioritário).
 */

export interface StoreOfferProduct {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  currency: string;
  image?: string;
  sku?: string;
  stockStatus: string | null;
  trackStock: boolean | null;
  stockQuantity: number | null;
  availableQuantity: number | null;
}

export interface CartComplement extends StoreOfferProduct {
  relationType: RelationType;
  intent: RelationIntent;
  /** Artigo do carrinho que originou a sugestão. */
  forProductId: string;
  forProductName: string;
}

export interface CartUnavailableItem {
  productId: string;
  name: string;
  requestedQuantity: number;
  /** Quantidade que ainda é possível comprar (0 = esgotado). */
  availableQuantity: number;
  reason: "out_of_stock" | "unpublished" | "insufficient_stock";
  alternatives: CartComplement[];
}

const REJECTED_VALIDATION = new Set(["pending", "rejected"]);
const COMPLEMENT_TYPES: RelationType[] = ["accessory", "required", "bundle", "compatible", "upgrade"];
const SUBSTITUTE_TYPES: RelationType[] = ["alternative", "compatible", "upgrade"];

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

function toOfferProduct(p: RawProduct): StoreOfferProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.store_slug ?? null,
    price: Number(p.base_price ?? 0),
    currency: p.currency || "EUR",
    image: resolveImage(p),
    sku: p.sku || undefined,
    stockStatus: p.stock_status ?? null,
    trackStock: p.track_stock ?? null,
    stockQuantity: typeof p.stock_quantity === "number" ? p.stock_quantity : null,
    availableQuantity: availableQuantity(p),
  };
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

interface CartOffersResult {
  complements: CartComplement[];
  unavailable: CartUnavailableItem[];
}

export function useStoreCartOffers(
  workspaceId: string | undefined,
  items: CartItem[],
  options: { limit?: number; enabled?: boolean } = {},
) {
  const limit = options.limit ?? 4;
  const cartKey = useMemo(
    () =>
      items
        .map((i) => `${i.productId}:${i.quantity}`)
        .sort()
        .join("|"),
    [items],
  );

  const query = useQuery<CartOffersResult>({
    queryKey: ["store-cart-offers", workspaceId, cartKey, limit],
    enabled: !!workspaceId && items.length > 0 && options.enabled !== false,
    staleTime: 30_000,
    queryFn: async () => {
      const cartIds = items.map((i) => i.productId);

      // 1. Estado real dos artigos no carrinho.
      const { data: cartProducts, error: cartError } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("workspace_id", workspaceId!)
        .in("id", cartIds);
      if (cartError) throw cartError;

      const cartById = new Map<string, RawProduct>((cartProducts || []).map((p: RawProduct) => [p.id, p]));

      // 2. Relações aprovadas para todos os artigos do carrinho.
      const { data: relations } = await supabase
        .from("product_relations")
        .select("source_product_id, target_product_id, relation_type, commercial_intent, validation_status, sort_order")
        .eq("workspace_id", workspaceId!)
        .in("source_product_id", cartIds)
        .eq("is_active", true)
        .order("sort_order");

      const approved = (relations || []).filter(
        (r: RawProduct) =>
          isRelationType(r.relation_type) &&
          !REJECTED_VALIDATION.has(String(r.validation_status || "").toLowerCase()),
      );

      const targetIds = Array.from(
        new Set(approved.map((r: RawProduct) => r.target_product_id as string)),
      ).filter((id) => !cartIds.includes(id));

      let targetById = new Map<string, RawProduct>();
      if (targetIds.length > 0) {
        const { data: targets } = await supabase
          .from("products")
          .select(PRODUCT_FIELDS)
          .in("id", targetIds)
          .eq("store_published", true)
          .eq("status", "active");
        targetById = new Map<string, RawProduct>((targets || []).map((p: RawProduct) => [p.id, p]));
      }

      const buildOffers = (
        sourceId: string,
        types: RelationType[],
      ): RelationOffer<RawProduct>[] => {
        const source = cartById.get(sourceId);
        const sourcePrice = source ? Number(source.base_price ?? 0) : null;
        return approved
          .filter((r: RawProduct) => r.source_product_id === sourceId)
          .filter((r: RawProduct) => types.includes(r.relation_type as RelationType))
          .map((r: RawProduct) => {
            const target = targetById.get(r.target_product_id);
            if (!target) return null;
            const relationType = r.relation_type as RelationType;
            const intent = (r.commercial_intent ||
              classifyRelationIntent(relationType, sourcePrice, Number(target.base_price ?? 0))) as RelationIntent;
            return { relationType, intent, target: toFacts(target), payload: target };
          })
          .filter(Boolean) as RelationOffer<RawProduct>[];
      };

      // 3. Complementos: sobem o ticket, nunca repetem o que já está no carrinho.
      const complements: CartComplement[] = [];
      const seen = new Set<string>(cartIds);
      for (const item of items) {
        const source = cartById.get(item.productId);
        const sourcePrice = source ? Number(source.base_price ?? 0) : null;
        const ranked = rankRelationOffers<RawProduct>(buildOffers(item.productId, COMPLEMENT_TYPES), {
          sourcePrice,
          sourceAvailable: true,
          limit,
        });
        for (const offer of ranked.upsell) {
          if (seen.has(offer.payload.id)) continue;
          seen.add(offer.payload.id);
          complements.push({
            ...toOfferProduct(offer.payload),
            relationType: offer.relationType,
            intent: offer.intent,
            forProductId: item.productId,
            forProductName: item.name,
          });
        }
      }

      // 4. Artigos indisponíveis + alternativas equivalentes reais.
      const unavailable: CartUnavailableItem[] = [];
      for (const item of items) {
        const product = cartById.get(item.productId);
        const available = product ? availableQuantity(product) : 0;
        const sellable = product
          ? isRelationAvailable(toFacts(product), { requireStorePublished: true })
          : false;
        const enoughStock = available === null || available >= item.quantity;

        if (sellable && enoughStock) continue;

        const reason: CartUnavailableItem["reason"] = !product
          ? "unpublished"
          : product.store_published === false || product.status !== "active"
            ? "unpublished"
            : sellable
              ? "insufficient_stock"
              : "out_of_stock";

        const sourcePrice = product ? Number(product.base_price ?? 0) : item.price;
        const ranked = rankRelationOffers<RawProduct>(buildOffers(item.productId, SUBSTITUTE_TYPES), {
          sourcePrice,
          sourceAvailable: false,
          limit,
        });
        const ordered = [...ranked.downsell, ...ranked.upsell];
        const alternatives: CartComplement[] = [];
        for (const offer of ordered) {
          if (alternatives.some((a) => a.id === offer.payload.id)) continue;
          alternatives.push({
            ...toOfferProduct(offer.payload),
            relationType: offer.relationType,
            intent: offer.intent,
            forProductId: item.productId,
            forProductName: item.name,
          });
          if (alternatives.length >= limit) break;
        }

        unavailable.push({
          productId: item.productId,
          name: product?.name || item.name,
          requestedQuantity: item.quantity,
          availableQuantity: sellable ? (available ?? item.quantity) : 0,
          reason,
          alternatives,
        });
      }

      return { complements: complements.slice(0, limit), unavailable };
    },
  });

  return {
    complements: query.data?.complements ?? [],
    unavailable: query.data?.unavailable ?? [],
    hasBlockingIssue: (query.data?.unavailable.length ?? 0) > 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
