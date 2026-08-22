/**
 * Filtros e ordenações do catálogo público aplicados no cliente.
 * Complementam os filtros suportados pela consulta ao servidor.
 */
import type { StoreFilters } from "@/components/store/StoreFilterSidebar";

export type CatalogSort = NonNullable<StoreFilters["sortBy"]>;

/** Ordenações suportadas diretamente pela consulta ao servidor. */
export const SERVER_SORTS: CatalogSort[] = ["price_asc", "price_desc", "name", "newest"];

export function isServerSort(sort?: string): sort is CatalogSort {
  return !!sort && (SERVER_SORTS as string[]).includes(sort);
}

const BRAND_KEYS = ["marca", "brand", "fabricante", "manufacturer"];

/** Deriva a marca a partir das especificações do produto. */
export function getProductBrand(product: any): string | null {
  const specs = product?.specifications;
  if (!specs || typeof specs !== "object") return null;
  for (const [key, value] of Object.entries(specs as Record<string, unknown>)) {
    if (BRAND_KEYS.includes(key.toLowerCase().trim()) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Lista de marcas disponíveis (ordenada, com contagem). */
export function getBrandFacets(products: any[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of products) {
    const brand = getProductBrand(p);
    if (!brand) continue;
    map.set(brand, (map.get(brand) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "pt"));
}

function hasActivePromo(product: any): boolean {
  const compareAt = product?.compare_at_price;
  if (typeof compareAt !== "number" || compareAt <= (product?.base_price ?? 0)) return false;
  const now = Date.now();
  const start = product?.promo_start_at ? new Date(product.promo_start_at).getTime() : null;
  const end = product?.promo_end_at ? new Date(product.promo_end_at).getTime() : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function getDiscountPercent(product: any): number {
  const compareAt = product?.compare_at_price;
  const price = product?.base_price ?? 0;
  if (typeof compareAt !== "number" || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

interface ClientContext {
  reviewStats?: Map<string, { sum: number; count: number }>;
  salesCounts?: Map<string, number>;
}

function ratingOf(id: string, ctx: ClientContext) {
  const stats = ctx.reviewStats?.get(id);
  if (!stats || stats.count === 0) return 0;
  return stats.sum / stats.count;
}

/** Aplica os filtros que a consulta ao servidor não cobre. */
export function applyClientFilters(products: any[], filters: StoreFilters, ctx: ClientContext = {}) {
  let list = products;

  if (filters.inStock) {
    list = list.filter((p) => p.stock_status !== "out_of_stock");
  }
  if (filters.condition) {
    list = list.filter((p) => p.product_condition === filters.condition);
  }
  if (filters.brands?.length) {
    const wanted = new Set(filters.brands);
    list = list.filter((p) => {
      const brand = getProductBrand(p);
      return brand ? wanted.has(brand) : false;
    });
  }
  if (filters.onlyPromo) {
    list = list.filter(hasActivePromo);
  }
  if (filters.minRating) {
    list = list.filter((p) => ratingOf(p.id, ctx) >= filters.minRating!);
  }

  return list;
}

/** Ordenações exclusivas do cliente (as restantes vêm já ordenadas do servidor). */
export function applyClientSort(products: any[], sortBy: StoreFilters["sortBy"], ctx: ClientContext = {}) {
  if (!sortBy || isServerSort(sortBy)) return products;
  const list = [...products];

  if (sortBy === "best_sellers") {
    list.sort((a, b) => (ctx.salesCounts?.get(b.id) || 0) - (ctx.salesCounts?.get(a.id) || 0));
  } else if (sortBy === "rating") {
    list.sort((a, b) => ratingOf(b.id, ctx) - ratingOf(a.id, ctx));
  } else if (sortBy === "discount") {
    list.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  }

  return list;
}

export interface FilterChip {
  key: string;
  label: string;
  clear: () => StoreFilters;
}

/** Chips de filtros ativos, com a respetiva ação de remoção. */
export function buildFilterChips(
  filters: StoreFilters,
  categories: { id: string; name: string }[],
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.categoryId) {
    const name = categories.find((c) => c.id === filters.categoryId)?.name || "Categoria";
    chips.push({ key: "category", label: name, clear: () => ({ ...filters, categoryId: undefined }) });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice ?? 0;
    const max = filters.maxPrice;
    chips.push({
      key: "price",
      label: max ? `€${min} – €${max}` : `A partir de €${min}`,
      clear: () => ({ ...filters, minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (filters.inStock) {
    chips.push({ key: "stock", label: "Em stock", clear: () => ({ ...filters, inStock: undefined }) });
  }
  if (filters.onlyPromo) {
    chips.push({ key: "promo", label: "Em promoção", clear: () => ({ ...filters, onlyPromo: undefined }) });
  }
  if (filters.minRating) {
    chips.push({
      key: "rating",
      label: `${filters.minRating}★ ou mais`,
      clear: () => ({ ...filters, minRating: undefined }),
    });
  }
  if (filters.condition) {
    chips.push({ key: "condition", label: "Condição", clear: () => ({ ...filters, condition: undefined }) });
  }
  for (const brand of filters.brands || []) {
    chips.push({
      key: `brand:${brand}`,
      label: brand,
      clear: () => ({ ...filters, brands: (filters.brands || []).filter((b) => b !== brand) }),
    });
  }

  return chips;
}
