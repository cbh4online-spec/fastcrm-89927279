import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, useProductCategories, useArchiveProduct, useDeleteProduct, useDeleteProductsBatch } from "@/hooks/useProducts";
import { useProductTypes, useBillingTypes } from "@/hooks/useProductSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useBarcodeLookup } from "@/hooks/useBarcodeLookup";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useColumnPreferences, ColumnConfig } from "@/components/common/ColumnSelector";
import { useColumnWidths } from "@/hooks/useColumnWidths";
import { useWorkspaceTags } from "@/hooks/useProductTags";
import { useDebounce } from "@/hooks/useDebounce";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
  type Product,
  type ProductType,
  type BillingType,
} from "@/types/product";
import { toast } from "sonner";
import { calcMarginPct, getNetPrice } from "@/utils/productPricing";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const PRODUCT_COLUMNS: ColumnConfig[] = [
  { id: "name", label: "Nome", category: "basic", defaultVisible: true },
  { id: "sku", label: "SKU", category: "basic", defaultVisible: false },
  { id: "product_type", label: "Tipo", category: "basic", defaultVisible: true },
  { id: "category", label: "Categoria", category: "basic", defaultVisible: true },
  { id: "short_description", label: "Descrição Curta", category: "basic", defaultVisible: false },
  { id: "commercial_description", label: "Descrição Comercial", category: "basic", defaultVisible: false },
  { id: "benefits", label: "Benefícios", category: "basic", defaultVisible: false },
  { id: "conditions", label: "Condições", category: "basic", defaultVisible: false },
  { id: "specifications", label: "Especificações", category: "basic", defaultVisible: false },
  { id: "currency", label: "Moeda", category: "business", defaultVisible: false },
  { id: "setup_fee", label: "Setup Fee", category: "business", defaultVisible: false },
  { id: "recurring_fee", label: "Mensalidade", category: "business", defaultVisible: false },
  { id: "target_margin_pct", label: "Margem Alvo", category: "business", defaultVisible: false },
  { id: "unit_name", label: "Nome Unidade", category: "business", defaultVisible: false },
  { id: "labor_hours", label: "Horas Trabalho", category: "business", defaultVisible: false },
  { id: "labor_hourly_rate", label: "€/Hora", category: "business", defaultVisible: false },
  { id: "sheet_slug", label: "Slug Ficha", category: "basic", defaultVisible: false },
  { id: "demo_video_url", label: "Vídeo Demo", category: "basic", defaultVisible: false },
  { id: "store_featured", label: "Destacado Loja", category: "basic", defaultVisible: false },
  { id: "primary_image_url", label: "Imagem Principal", category: "basic", defaultVisible: false },
  { id: "base_price", label: "Preço", category: "business", defaultVisible: true },
  { id: "direct_cost", label: "Custo Direto", category: "business", defaultVisible: false },
  { id: "operational_cost", label: "Custo Operacional", category: "business", defaultVisible: false },
  { id: "margin", label: "Margem", category: "business", defaultVisible: true },
  { id: "margin_status", label: "Saúde Margem", category: "business", defaultVisible: true },
  { id: "recommended_price", label: "PVP Recomendado", category: "business", defaultVisible: false },
  { id: "billing_type", label: "Cobrança", category: "business", defaultVisible: true },
  { id: "billing_frequency", label: "Frequência", category: "business", defaultVisible: false },
  { id: "status", label: "Estado", category: "basic", defaultVisible: false },
  { id: "store_published", label: "Loja Online", category: "basic", defaultVisible: true },
  { id: "b2b_published", label: "Portal B2B", category: "basic", defaultVisible: true },
  { id: "total_units", label: "Unidades", category: "business", defaultVisible: false },
  { id: "unit_duration", label: "Duração", category: "business", defaultVisible: false },
  { id: "validity_days", label: "Validade (dias)", category: "business", defaultVisible: false },
  { id: "tax_rate_estimate_pct", label: "Taxa IVA", category: "business", defaultVisible: false },
  { id: "commission_default", label: "Comissão", category: "business", defaultVisible: false },
  { id: "delivery_mode", label: "Modo Entrega", category: "business", defaultVisible: false },
  { id: "created_at", label: "Criado em", category: "basic", defaultVisible: false },
  { id: "updated_at", label: "Atualizado", category: "basic", defaultVisible: true },
];

export const INITIAL_COL_WIDTHS: Record<string, number> = {
  name: 220, sku: 120, product_type: 100, category: 130,
  base_price: 90, direct_cost: 100, operational_cost: 100, margin: 80, margin_status: 90, recommended_price: 110,
  billing_type: 100, billing_frequency: 100, status: 90,
  store_published: 90, b2b_published: 80, total_units: 80,
  unit_duration: 90, validity_days: 90, tax_rate_estimate_pct: 80,
  commission_default: 90, delivery_mode: 100, created_at: 110, updated_at: 110,
};

export const pageTabs = [
  { id: "products", label: "Produtos" },
  { id: "categories", label: "Categorias" },
  { id: "pricing", label: "Tabelas de Preço" },
  { id: "bundles", label: "Bundles" },
  { id: "qa", label: "Perguntas" },
  { id: "pricing-rules", label: "Regras de Preço" },
  { id: "stock-alerts", label: "Alertas Stock" },
  { id: "health", label: "Saúde Preços" },
  { id: "reports", label: "Relatórios" },
  { id: "settings", label: "Configurações" },
];

export const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "price_asc", label: "Preço (menor)" },
  { value: "price_desc", label: "Preço (maior)" },
  { value: "updated_desc", label: "Mais recentes" },
  { value: "updated_asc", label: "Mais antigos" },
];

function escapeCsvField(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Parse sortValue (e.g. "name_asc") into sortBy + sortDirection */
function parseSortValue(sortValue: string): { sortBy: string; sortDirection: "asc" | "desc" } {
  switch (sortValue) {
    case "name_asc": return { sortBy: "name", sortDirection: "asc" };
    case "name_desc": return { sortBy: "name", sortDirection: "desc" };
    case "price_asc": return { sortBy: "base_price", sortDirection: "asc" };
    case "price_desc": return { sortBy: "base_price", sortDirection: "desc" };
    case "updated_asc": return { sortBy: "updated_at", sortDirection: "asc" };
    case "updated_desc":
    default:
      return { sortBy: "updated_at", sortDirection: "desc" };
  }
}

export function useProductsListState() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- UI state ---
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [billingFilter, setBillingFilter] = useState<string>("all");
  const [storePublishedFilter, setStorePublishedFilter] = useState<boolean | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("products");
  const [showFilterSidebar, setShowFilterSidebar] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  // Permite deep-link a partir de outras páginas (ex.: Stock Valorizado) via ?search=SKU
  const [searchValue, setSearchValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") || "";
  });
  const [sortValue, setSortValue] = useState("updated_desc");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCostOpen, setBulkCostOpen] = useState(false);

  // --- Debounce search (proper cleanup via hook) ---
  const debouncedSearch = useDebounce(searchValue, 300);

  // --- Parse sort into server params ---
  const { sortBy, sortDirection } = parseSortValue(sortValue);

  // --- Barcode ---
  const { lookup, isLoading: scanLoading, result: scanResult, reset: resetScan } = useBarcodeLookup(currentWorkspace?.id);
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);
    setScanResultOpen(true);
    await lookup(barcode);
  }, [lookup]);

  // --- Column preferences ---
  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences(
    "products-table-columns-v2",
    PRODUCT_COLUMNS
  );
  const colWidths = useColumnWidths("products-table-columns-v2", INITIAL_COL_WIDTHS);
  const tableRef = useRef<HTMLTableElement | null>(null);

  // Global mouse events for column resize
  useEffect(() => {
    const handleMove = (e: MouseEvent) => colWidths.onMouseMove(e);
    const handleUp = () => colWidths.onMouseUp();
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [colWidths.onMouseMove, colWidths.onMouseUp]);

  // --- Data queries (server-side sort + filter) ---
  const productsQueryKey = useMemo(() => ["products", currentWorkspace?.id, {
    status: statusFilter,
    productType: typeFilter,
    category: categoryFilter,
    search: debouncedSearch || undefined,
    billingType: billingFilter !== "all" ? billingFilter : undefined,
    storePublished: storePublishedFilter,
    sortBy,
    sortDirection,
  }], [currentWorkspace?.id, statusFilter, typeFilter, categoryFilter, debouncedSearch, billingFilter, storePublishedFilter, sortBy, sortDirection]);

  const { data: products, isLoading, refetch } = useProducts({
    status: statusFilter,
    productType: typeFilter,
    category: categoryFilter,
    search: debouncedSearch || undefined,
    billingType: billingFilter !== "all" ? billingFilter : undefined,
    storePublished: storePublishedFilter,
    sortBy,
    sortDirection,
  });

  const { data: categories } = useProductCategories();
  const { data: workspaceTags } = useWorkspaceTags();
  const { data: productTypesConfig } = useProductTypes();
  const { data: billingTypesConfig } = useBillingTypes();

  // --- Mutations ---
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useDeleteProduct();
  const deleteProductsBatch = useDeleteProductsBatch();

  // --- Optimistic toggle store_published ---
  const toggleStorePublished = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ store_published: published } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, published }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });
      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<Product[]>(productsQueryKey);
      // Optimistically update
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(productsQueryKey, 
          previousProducts.map(p => p.id === id ? { ...p, store_published: published } as any : p)
        );
      }
      return { previousProducts };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previousProducts) {
        queryClient.setQueryData(productsQueryKey, context.previousProducts);
      }
      toast.error("Erro ao atualizar visibilidade na loja");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // --- Optimistic inline field update (price + other editable fields) ---
  const EDITABLE_FIELDS = new Set([
    "base_price", "direct_cost", "operational_cost", "operational_cost_mode", "operational_cost_base",
    "sku", "category", "product_type",
    "total_units", "unit_duration", "validity_days",
    "tax_rate_estimate_pct", "commission_default",
  ]);

  const updateProductPrice = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string | number | null }) => {
      if (!EDITABLE_FIELDS.has(field)) throw new Error(`Campo não editável: ${field}`);
      const { error } = await supabase
        .from("products")
        .update({ [field]: value, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previousProducts = queryClient.getQueryData<Product[]>(productsQueryKey);
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(productsQueryKey,
          previousProducts.map(p => p.id === id ? { ...p, [field]: value } as Product : p)
        );
      }
      return { previousProducts };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productsQueryKey, context.previousProducts);
      }
      toast.error("Erro ao atualizar campo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onSuccess: () => {
      toast.success("Atualizado");
    },
  });

  // --- Tag filter query ---
  const activeTagName = activeFilterId?.startsWith("tag_") ? activeFilterId.replace("tag_", "") : null;
  const { data: tagProductIds } = useQuery({
    queryKey: ["tag-product-ids", currentWorkspace?.id, activeTagName],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("product_tags")
        .select("product_id")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("tag", activeTagName!);
      return (data || []).map((d: any) => d.product_id as string);
    },
    enabled: !!activeTagName && !!currentWorkspace?.id,
  });

  // --- Label helpers ---
  const getProductTypeLabel = useCallback((typeCode: string) => {
    const dynamicType = productTypesConfig?.find(t => t.code === typeCode);
    if (dynamicType) return dynamicType.label;
    if (typeCode in productTypeLabels) return productTypeLabels[typeCode as ProductType];
    return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
  }, [productTypesConfig]);

  const getBillingTypeLabel = useCallback((typeCode: string) => {
    const dynamicType = billingTypesConfig?.find(t => t.code === typeCode);
    if (dynamicType) return dynamicType.label;
    if (typeCode in billingTypeLabels) return billingTypeLabels[typeCode as BillingType];
    return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
  }, [billingTypesConfig]);

  // --- Filtered products (only smart/tag filters remain client-side) ---
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products;

    // Client-side search (for immediate feedback while debounce is pending)
    if (searchValue && searchValue !== debouncedSearch) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower)
      );
    }

    // Smart filters (client-side only — calculated fields)
    if (activeFilterId?.startsWith("smart_")) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      switch (activeFilterId) {
        case "smart_recent":
          result = result.filter((p) => new Date(p.updated_at) >= sevenDaysAgo);
          break;
        case "smart_high_price":
          result = result.filter((p) => (p.base_price || 0) > 100);
          break;
        case "smart_low_price":
          result = result.filter((p) => (p.base_price || 0) < 50);
          break;
        case "smart_invalid_sku":
          result = result.filter((p) => {
            if (!p.sku) return false;
            const sku = p.sku;
            if (/<[^>]+>/.test(sku)) return true;
            if (/^\d+[\s.,]*[a-zA-Zµ°]{1,5}$/.test(sku.trim())) return true;
            if (sku.split(/\s+/).length > 3) return true;
            if (/^(Impermeável|Ethernet|Iluminação|Compatible|Resolução|BaseT)/i.test(sku.trim())) return true;
            return false;
          });
          break;
        case "smart_no_price":
          result = result.filter((p) => !p.base_price || p.base_price === 0);
          break;
        case "smart_no_cost":
          result = result.filter((p) => !p.direct_cost || p.direct_cost === 0);
          break;
        case "smart_negative_margin":
          result = result.filter((p) => {
            const net = getNetPrice(p);
            return p.direct_cost && net > 0 && p.direct_cost > net;
          });
          break;
        case "smart_low_margin":
          result = result.filter((p) => {
            const m = calcMarginPct(p);
            return m != null && m > 0 && m < 15;
          });
          break;
        case "smart_no_image":
          result = result.filter((p) => !p.images || p.images.length === 0);
          break;
        case "smart_no_sku":
          result = result.filter((p) => !p.sku || p.sku.trim() === "");
          break;
        case "smart_no_category":
          result = result.filter((p) => !p.category || p.category.trim() === "");
          break;
        case "smart_no_description":
          result = result.filter((p) => !p.short_description && !p.commercial_description);
          break;
      }
    }

    // Tag filter (client-side join)
    if (activeFilterId?.startsWith("tag_") && tagProductIds) {
      result = result.filter((p) => tagProductIds.includes(p.id));
    }

    return result;
  }, [products, searchValue, debouncedSearch, activeFilterId, tagProductIds]);

  // --- Pagination ---
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // --- Product health indicators ---
  const productIndicators = useMemo(() => {
    if (!products) return { total: 0, noPrice: 0, noCost: 0, negativeMargin: 0, lowMargin: 0, noImage: 0 };
    const noPrice = products.filter(p => !p.base_price || p.base_price === 0).length;
    const noCost = products.filter(p => !p.direct_cost || p.direct_cost === 0).length;
    const negativeMargin = products.filter(p => p.direct_cost && p.direct_cost > p.base_price).length;
    const lowMargin = products.filter(p => {
      if (!p.base_price || !p.direct_cost || p.base_price === 0) return false;
      const m = ((p.base_price - p.direct_cost) / p.base_price) * 100;
      return m > 0 && m < 15;
    }).length;
    const hasAnyImage = (p: Product) => {
      if (p.images && p.images.length > 0) return true;
      const rel = (p as any).product_images;
      return Array.isArray(rel) && rel.length > 0;
    };
    const noImage = products.filter(p => !hasAnyImage(p)).length;
    return { total: products.length, noPrice, noCost, negativeMargin, lowMargin, noImage };
  }, [products]);

  const filtersActive = statusFilter !== "active" || typeFilter !== "all" || categoryFilter !== "all" || billingFilter !== "all" || storePublishedFilter !== undefined || !!activeFilterId;

  // --- Handlers ---
  const handleFilterSelect = useCallback((filterId: string) => {
    if (activeFilterId === filterId) {
      setActiveFilterId(undefined);
      if (filterId.startsWith("type_")) setTypeFilter("all");
      else if (filterId.startsWith("status_")) setStatusFilter("active");
      else if (filterId.startsWith("cat_")) setCategoryFilter("all");
      else if (filterId.startsWith("billing_")) setBillingFilter("all");
      else if (filterId === "store_yes" || filterId === "store_no") setStorePublishedFilter(undefined);
      return;
    }
    setActiveFilterId(filterId);
    setCurrentPage(1);
    if (filterId.startsWith("type_")) setTypeFilter(filterId.replace("type_", ""));
    else if (filterId.startsWith("status_")) setStatusFilter(filterId.replace("status_", ""));
    else if (filterId.startsWith("cat_")) setCategoryFilter(filterId.replace("cat_", ""));
    else if (filterId.startsWith("billing_")) setBillingFilter(filterId.replace("billing_", ""));
    else if (filterId === "store_yes") setStorePublishedFilter(true);
    else if (filterId === "store_no") setStorePublishedFilter(false);
  }, [activeFilterId]);

  const handleClearFilters = useCallback(() => {
    setActiveFilterId(undefined);
    setStatusFilter("active");
    setTypeFilter("all");
    setCategoryFilter("all");
    setBillingFilter("all");
    setStorePublishedFilter(undefined);
    setSearchValue("");
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? paginatedProducts.map((p) => p.id) : []);
  }, [paginatedProducts]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id)
    );
  }, []);

  const handleArchive = useCallback(async (product: Product) => {
    await archiveProduct.mutateAsync({
      id: product.id,
      archive: product.status === "active",
    });
  }, [archiveProduct]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmProduct) return;
    await deleteProduct.mutateAsync(deleteConfirmProduct.id);
    setDeleteConfirmProduct(null);
  }, [deleteConfirmProduct, deleteProduct]);

  const handleBulkExport = useCallback(() => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    const csv = [
      ["Nome", "Tipo", "Categoria", "Preço", "Cobrança", "Estado"].join(","),
      ...selected.map((p) =>
        [
          escapeCsvField(p.name),
          escapeCsvField(getProductTypeLabel(p.product_type)),
          escapeCsvField(p.category),
          escapeCsvField(p.base_price),
          escapeCsvField(getBillingTypeLabel(p.billing_type)),
          escapeCsvField(productStatusLabels[p.status]),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selected.length} produtos exportados`);
  }, [products, selectedIds, getProductTypeLabel, getBillingTypeLabel]);

  const handleBulkArchive = useCallback(async () => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    for (const p of selected) {
      await archiveProduct.mutateAsync({ id: p.id, archive: true });
    }
    setSelectedIds([]);
    toast.success(`${selected.length} produtos arquivados`);
  }, [products, selectedIds, archiveProduct]);

  // --- Bulk publish/unpublish ---
  const handleBulkPublish = useCallback(async (published: boolean) => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    const { error } = await supabase
      .from("products")
      .update({ store_published: published } as any)
      .in("id", selectedIds);
    if (error) {
      toast.error("Erro ao atualizar visibilidade em massa");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSelectedIds([]);
    toast.success(`${selected.length} produtos ${published ? "publicados" : "removidos"} da loja`);
  }, [products, selectedIds, queryClient]);

  // --- Bulk duplicate ---
  const handleBulkDuplicate = useCallback(async () => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    const copies = selected.map((p) => ({
      name: `${p.name} (cópia)`,
      product_type: p.product_type,
      category: p.category,
      base_price: p.base_price,
      currency: p.currency,
      billing_type: p.billing_type,
      direct_cost: p.direct_cost,
      operational_cost: p.operational_cost,
      status: "active" as const,
      workspace_id: currentWorkspace!.id,
      created_by: user!.id,
      short_description: p.short_description,
      images: p.images,
    }));
    const { error } = await supabase.from("products").insert(copies);
    if (error) {
      toast.error("Erro ao duplicar produtos: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSelectedIds([]);
    toast.success(`${selected.length} produtos duplicados`);
  }, [products, selectedIds, currentWorkspace, queryClient]);

  const formatCurrency = useCallback((value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
  }, []);

  // --- Keyboard shortcuts ---
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd+F → focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && activeTab === "products") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape → clear selection or close sidebar
      if (e.key === "Escape") {
        if (selectedIds.length > 0) {
          setSelectedIds([]);
        } else if (showFilterSidebar) {
          setShowFilterSidebar(false);
        }
      }
      // Ctrl/Cmd+A → select all on current page
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && activeTab === "products") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setSelectedIds(paginatedProducts.map(p => p.id));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeTab, selectedIds.length, showFilterSidebar, paginatedProducts]);

  return {
    currentWorkspace,
    products, isLoading, refetch,
    categories, workspaceTags, productTypesConfig, billingTypesConfig,
    filteredProducts, paginatedProducts, totalProducts, totalPages,
    productIndicators,
    toggleStorePublished, archiveProduct, deleteProduct, deleteProductsBatch,
    updateProductPrice,
    statusFilter, typeFilter, categoryFilter, billingFilter, storeFilter,
    storePublishedFilter,
    activeFilterId, filtersActive,
    handleFilterSelect, handleClearFilters,
    setStatusFilter, setTypeFilter, setCategoryFilter, setStoreFilter,
    searchValue, setSearchValue, sortValue, setSortValue,
    currentPage, setCurrentPage, pageSize, setPageSize,
    selectedIds, setSelectedIds, handleSelectAll, handleSelectOne,
    activeTab, setActiveTab,
    showFilterSidebar, setShowFilterSidebar,
    createOpen, setCreateOpen,
    batchImportOpen, setBatchImportOpen,
    editProduct, setEditProduct,
    detailProduct, setDetailProduct,
    scannerOpen, setScannerOpen,
    scanResultOpen, setScanResultOpen,
    scannedBarcode, handleBarcodeScan, scanLoading, scanResult, resetScan,
    deleteConfirmProduct, setDeleteConfirmProduct,
    bulkDeleteOpen, setBulkDeleteOpen,
    bulkCostOpen, setBulkCostOpen,
    handleArchive, handleDeleteConfirm,
    handleBulkExport, handleBulkArchive, handleBulkPublish, handleBulkDuplicate,
    visibleColumns, setVisibleColumns, columnOrder, setColumnOrder,
    colWidths, tableRef,
    searchInputRef,
    getProductTypeLabel, getBillingTypeLabel, formatCurrency,
  };
}
