import { formatStoreTitle } from "@/lib/store/displayTitle";
import { sortRecommended, type RankableProduct } from "@/lib/store/recommendedRank";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { descendantIds, countByVisibleRoot, visibleRoots, type CategoryNode } from "@/lib/store/categoryTree";
import {
  buildStorefrontProductSearchFilter,
  getMatchingProductReference,
  normalizeStorefrontSearchTerm,
} from "@/lib/store/productSearch";

export interface StoreProduct {
  id: string;
  /** Slug público usado no URL da loja (SEO). */
  store_slug?: string | null;
  workspace_id: string;
  name: string;
  product_type: string;
  category: string | null;
  base_price: number;
  currency: string;
  billing_type: string;
  short_description: string | null;
  commercial_description: string | null;
  images: string[];
  primary_image_index: number | null;
  benefits: string[] | null;
  sku: string | null;
  barcode?: string | null;
  saft_product_code?: string | null;
  matched_reference?: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  track_stock: boolean | null;
  store_featured: boolean | null;
  created_at?: string;
  store_sort_order: number | null;
  store_category_id: string | null;
  specifications: Record<string, string> | null;
  demo_video_url: string | null;
  price_on_request?: boolean;
  // Promotion fields (Omnibus Directive)
  compare_at_price?: number | null;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  promo_label?: string | null;
  lowest_price_30d?: number | null;
}

export interface StoreCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  position: number;
  is_active: boolean;
  image_url: string | null;
  color: string | null;
  icon: string | null;
  store_visible: boolean;
  product_count?: number;
}

interface UseStoreProductsOptions {
  workspaceId?: string;
  categoryId?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "name" | "newest";
}

type VariantSearchMatch = { product_id: string; sku: string | null };

async function findVariantReferences(workspaceId: string | undefined, search?: string): Promise<VariantSearchMatch[]> {
  const normalizedSearch = normalizeStorefrontSearchTerm(search);
  if (!workspaceId || !normalizedSearch) return [];

  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id, sku")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .ilike("sku", `%${normalizedSearch}%`)
    .limit(100);

  if (error) throw error;
  return (data || []) as VariantSearchMatch[];
}

function addMatchedReferences(products: StoreProduct[], search: string | undefined, variants: VariantSearchMatch[]) {
  const variantByProduct = new Map(variants.map((variant) => [variant.product_id, variant.sku]));
  return products.map((product) => ({
    ...product,
    matched_reference: search
      ? getMatchingProductReference(product, search, variantByProduct.get(product.id))
      : null,
  }));
}

type PublicCategoryRow = CategoryNode & {
  slug: string | null;
  description: string | null;
  position: number | null;
  image_url: string | null;
  color: string | null;
  icon: string | null;
};

/** Árvore pública (RPC sem campos de custo/admin), limitada ao workspace. */
async function fetchPublicCategoryTree(workspaceId: string): Promise<PublicCategoryRow[]> {
  const { data, error } = await (supabase as any).rpc("get_public_store_category_tree", { p_workspace_id: workspaceId });
  if (error) throw error;
  return ((data || []) as PublicCategoryRow[]).filter((c) => c.workspace_id === workspaceId);
}

/** IDs a filtrar: categoria pedida + descendentes (raiz inclui filhos; filho oculto só o seu ramo). */
async function resolveCategoryFilterIds(workspaceId: string, categoryId: string): Promise<string[]> {
  const tree = await fetchPublicCategoryTree(workspaceId);
  if (!tree.some((c) => c.id === categoryId)) return [categoryId];
  return descendantIds(tree, categoryId);
}

export function useStoreProducts({ workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy }: UseStoreProductsOptions) {
  return useQuery({
    queryKey: ["store-products", workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy],
    queryFn: async () => {
      const normalizedSearch = normalizeStorefrontSearchTerm(search);
      const variantMatches = await findVariantReferences(workspaceId, normalizedSearch);
      let query = supabase
        .from("products")
        .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, barcode, saft_product_code, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, created_at, workspace_id, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("ai_commerce_gate_blocked", false)
        .eq("status", "active");

      if (categoryId) {
        query = query.in("store_category_id", await resolveCategoryFilterIds(workspaceId!, categoryId));
      } else if (category) {
        query = query.eq("category", category);
      }

      if (normalizedSearch) {
        query = query.or(buildStorefrontProductSearchFilter(normalizedSearch, variantMatches.map((match) => match.product_id)));
      }

      if (featured) {
        query = query.eq("store_featured", true);
      }

      if (minPrice !== undefined) {
        query = query.gte("base_price", minPrice);
      }
      if (maxPrice !== undefined) {
        query = query.lte("base_price", maxPrice);
      }

      // Sorting
      if (sortBy === "price_asc") {
        query = query.order("base_price", { ascending: true });
      } else if (sortBy === "price_desc") {
        query = query.order("base_price", { ascending: false });
      } else if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("store_sort_order", { ascending: true }).order("name", { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return withDisplayTitles(addMatchedReferences((data || []) as StoreProduct[], normalizedSearch, variantMatches));
    },
    enabled: !!workspaceId,
  });
}

const PAGE_SIZE = 12;

function withDisplayTitles<T extends { name?: string | null }>(list: T[]): T[] {
  return list.map((p) => ({ ...p, name: formatStoreTitle(p.name) }));
}

export interface InfiniteStoreProductsOptions extends UseStoreProductsOptions {
  brands?: string[];
}

const FULL_SELECT = "id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, barcode, saft_product_code, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, created_at, workspace_id, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d, brand";

/**
 * Catálogo paginado. Constrói primeiro um índice leve de TODO o catálogo que
 * corresponde aos filtros (para contagem real e ordenação "Recomendados") e
 * depois carrega os detalhes apenas da página pedida.
 */
export function useInfiniteStoreProducts({ workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy, brands }: InfiniteStoreProductsOptions) {
  return useInfiniteQuery({
    queryKey: ["store-products-infinite", workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy, brands?.join("|") || ""],
    queryFn: async ({ pageParam = 0 }) => {
      const normalizedSearch = normalizeStorefrontSearchTerm(search);
      const variantMatches = await findVariantReferences(workspaceId, normalizedSearch);
      const categoryIds = categoryId ? await resolveCategoryFilterIds(workspaceId!, categoryId) : null;
      const base = (select: string) => {
        let q = supabase
          .from("products")
          .select(select)
          .eq("workspace_id", workspaceId!)
          .eq("store_published", true)
          .eq("ai_commerce_gate_blocked", false)
          .eq("status", "active");
        if (categoryIds) q = q.in("store_category_id", categoryIds);
        else if (category) q = q.eq("category", category);
        if (normalizedSearch) q = q.or(buildStorefrontProductSearchFilter(normalizedSearch, variantMatches.map((m) => m.product_id)));
        if (featured) q = q.eq("store_featured", true);
        if (minPrice !== undefined) q = q.gte("base_price", minPrice);
        if (maxPrice !== undefined) q = q.lte("base_price", maxPrice);
        if (brands?.length) q = q.in("brand", brands);
        return q;
      };

      let index = base("id, name, base_price, created_at, store_sort_order, store_featured, stock_status");
      if (sortBy === "price_asc") index = index.order("base_price", { ascending: true });
      else if (sortBy === "price_desc") index = index.order("base_price", { ascending: false });
      else if (sortBy === "newest") index = index.order("created_at", { ascending: false });
      else index = index.order("name", { ascending: true });
      const { data: idx, error: idxErr } = await index.limit(5000);
      if (idxErr) throw idxErr;
      let ordered = (idx || []) as unknown as RankableProduct[];
      if (!sortBy) ordered = sortRecommended(ordered);

      const from = pageParam * PAGE_SIZE;
      const pageIds = ordered.slice(from, from + PAGE_SIZE).map((p) => p.id);
      let items: StoreProduct[] = [];
      if (pageIds.length) {
        const { data, error } = await base(FULL_SELECT).in("id", pageIds);
        if (error) throw error;
        const byId = new Map(((data || []) as unknown as StoreProduct[]).map((p) => [p.id, p]));
        items = pageIds.map((id) => byId.get(id)).filter(Boolean) as StoreProduct[];
      }
      return {
        items: withDisplayTitles(addMatchedReferences(items, normalizedSearch, variantMatches)),
        total: ordered.length,
        hasMore: from + PAGE_SIZE < ordered.length,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
    enabled: !!workspaceId,
  });
}

/**
 * Linhas leves partilhadas (categoria + marca) de todo o catálogo público.
 * Uma única leitura alimenta o menu de categorias e as marcas, em vez de duas.
 */
type FacetRow = { store_category_id: string | null; brand: string | null; workspace_id: string };
function useStoreFacetRows<T>(workspaceId: string | undefined, select: (rows: FacetRow[]) => T) {
  return useQuery({
    queryKey: ["store-facet-rows", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("store_category_id, brand, workspace_id")
        .eq("workspace_id", workspaceId!)
        .eq("store_published", true)
        .eq("ai_commerce_gate_blocked", false)
        .eq("status", "active")
        .limit(5000);
      if (error) throw error;
      return (data || []) as FacetRow[];
    },
    select,
  });
}

export function brandFacetsFromRows(rows: FacetRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const b = (r.brand || "").trim();
    if (b) map.set(b, (map.get(b) || 0) + 1);
  }
  return Array.from(map, ([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "pt"));
}

/** Marcas reais de todo o catálogo publicado (coluna brand), com contagem. */
export function useStoreBrandFacets(workspaceId?: string) {
  return useStoreFacetRows(workspaceId, brandFacetsFromRows);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aceita o UUID do produto (legado) ou o slug público (store_slug). */
export function useStoreProduct(productIdOrSlug: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: ["store-product", productIdOrSlug, workspaceId || ""],
    queryFn: async () => {
      if (!productIdOrSlug || !workspaceId) return null;

      let query = supabase
        .from("products")
        .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, workspace_id, created_at, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d, metadata, seo_title, seo_description, schema_type, canonical_url")
        .eq("store_published", true)
        .eq("ai_commerce_gate_blocked", false)
        .eq("status", "active");

      query = UUID_RE.test(productIdOrSlug)
        ? query.eq("id", productIdOrSlug)
        : query.eq("store_slug", productIdOrSlug);

      query = query.eq("workspace_id", workspaceId);


      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (data) return withDisplayTitles([data as any])[0] as StoreProduct & { workspace_id: string };

      // Fallback: links antigos/truncados — resolve por prefixo do slug
      if (!UUID_RE.test(productIdOrSlug) && productIdOrSlug.length >= 8) {
        let fallback = supabase
          .from("products")
          .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, workspace_id, created_at, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d, metadata, seo_title, seo_description, schema_type, canonical_url")
          .eq("store_published", true)
        .eq("ai_commerce_gate_blocked", false)
          .eq("status", "active")
          .like("store_slug", `${productIdOrSlug}%`)
          .limit(2);

        fallback = fallback.eq("workspace_id", workspaceId);

        const { data: matches, error: fbError } = await fallback;
        if (fbError) throw fbError;
        if (matches && matches.length === 1) {
          return withDisplayTitles([matches[0] as any])[0] as StoreProduct & { workspace_id: string };
        }
      }

      return null;
    },

    enabled: !!productIdOrSlug && !!workspaceId,
  });
}

export function useStoreCategories(workspaceId: string) {
  const treeQ = useQuery({
    queryKey: ["store-category-tree-rpc", workspaceId],
    queryFn: () => fetchPublicCategoryTree(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
  const rowsQ = useStoreFacetRows(workspaceId, (rows) => rows.filter((r) => r.store_category_id));
  const data = useMemo(() => {
    if (!treeQ.data || !rowsQ.data) return undefined;
    const tree = treeQ.data;
    const counts = countByVisibleRoot(tree, rowsQ.data as any[], workspaceId);
    // Menu: só raízes visíveis com pelo menos 1 produto público (incluindo descendentes)
    return visibleRoots(tree, workspaceId)
      .map((c) => ({
        ...c,
        slug: c.slug,
        description: c.description,
        position: c.position ?? 0,
        is_active: true,
        product_count: counts[c.id] || 0,
      }) as StoreCategory)
      .filter((c) => (c.product_count || 0) > 0);
  }, [treeQ.data, rowsQ.data, workspaceId]);
  return {
    data,
    isLoading: treeQ.isLoading || rowsQ.isLoading,
    isError: treeQ.isError || rowsQ.isError,
    error: treeQ.error || rowsQ.error,
  };
}
