import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Archive,
  RotateCcw,
  Package,
  Loader2,
  Eye,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Calendar,
  CircleDollarSign,
  Repeat,
  FileBox,
  Clock,
  Upload,
  GraduationCap,
  Boxes,
  Box,
  Tag,
  Trash2,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProducts, useProductCategories, useArchiveProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useProductTypes, useBillingTypes } from "@/hooks/useProductSettings";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductDetailDialog } from "./ProductDetailDialog";
import { BatchSKUImportDialog } from "./BatchSKUImportDialog";
import { CategoriesTabContent } from "./CategoriesTabContent";
import { PricingTabContent } from "./PricingTabContent";
import { ProductSettingsTabContent } from "./settings/ProductSettingsTabContent";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { ColumnSelector, ColumnConfig, useColumnPreferences } from "@/components/common/ColumnSelector";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
  type Product,
  type ProductType,
  type BillingType,
} from "@/types/product";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Column configuration for products table
const PRODUCT_COLUMNS: ColumnConfig[] = [
  { id: "name", label: "Nome", category: "basic", defaultVisible: true },
  { id: "sku", label: "SKU", category: "basic", defaultVisible: false },
  { id: "product_type", label: "Tipo", category: "basic", defaultVisible: true },
  { id: "category", label: "Categoria", category: "basic", defaultVisible: true },
  { id: "base_price", label: "Preço", category: "business", defaultVisible: true },
  { id: "direct_cost", label: "Custo Direto", category: "business", defaultVisible: false },
  { id: "operational_cost", label: "Custo Operacional", category: "business", defaultVisible: false },
  { id: "margin", label: "Margem", category: "business", defaultVisible: false },
  { id: "billing_type", label: "Cobrança", category: "business", defaultVisible: true },
  { id: "billing_frequency", label: "Frequência", category: "business", defaultVisible: false },
  { id: "status", label: "Estado", category: "basic", defaultVisible: true },
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

const pageTabs = [
  { id: "products", label: "Produtos" },
  { id: "categories", label: "Categorias" },
  { id: "pricing", label: "Tabelas de Preço" },
  { id: "settings", label: "Configurações" },
];

const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "price_asc", label: "Preço (menor)" },
  { value: "price_desc", label: "Preço (maior)" },
  { value: "updated_desc", label: "Mais recentes" },
  { value: "updated_asc", label: "Mais antigos" },
];

export function ProductsList() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  
  // New state for reorganized UI
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeTab, setActiveTab] = useState("products");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("updated_desc");

  // Column preferences with persistence
  const { visibleColumns, setVisibleColumns, columnOrder, setColumnOrder } = useColumnPreferences(
    "products-table-columns",
    PRODUCT_COLUMNS
  );

  // Debounce search for API calls
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Use searchValue for sidebar filtering
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Debounce the API search
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  };

  const { data: products, isLoading, refetch } = useProducts({
    status: statusFilter,
    productType: typeFilter,
    category: categoryFilter,
    search: debouncedSearch || undefined,
  });

  const { data: categories } = useProductCategories();
  const { data: productTypesConfig } = useProductTypes();
  const { data: billingTypesConfig } = useBillingTypes();
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useDeleteProduct();
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Helper para obter label do tipo de produto
  const getProductTypeLabel = (typeCode: string) => {
    const dynamicType = productTypesConfig?.find(t => t.code === typeCode);
    if (dynamicType) return dynamicType.label;
    if (typeCode in productTypeLabels) {
      return productTypeLabels[typeCode as ProductType];
    }
    return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
  };

  // Helper para obter label do tipo de cobrança
  const getBillingTypeLabel = (typeCode: string) => {
    const dynamicType = billingTypesConfig?.find(t => t.code === typeCode);
    if (dynamicType) return dynamicType.label;
    if (typeCode in billingTypeLabels) {
      return billingTypeLabels[typeCode as BillingType];
    }
    return typeCode.charAt(0).toUpperCase() + typeCode.slice(1);
  };

  // Filter groups for sidebar - dynamic from config
  const filterGroups: FilterGroup[] = useMemo(() => {
    // Build type items dynamically from productTypesConfig
    const typeItems = productTypesConfig?.filter(t => t.is_active).map(type => ({
      id: `type_${type.code}`,
      label: type.label,
      icon: <Package className="h-4 w-4" />
    })) || [
      // Fallback static items if config not loaded
      { id: "type_simple", label: "Simples", icon: <Package className="h-4 w-4" /> },
      { id: "type_recurring", label: "Recorrente", icon: <Repeat className="h-4 w-4" /> },
      { id: "type_composite", label: "Bundle", icon: <FileBox className="h-4 w-4" /> },
    ];

    // Build billing items dynamically from billingTypesConfig
    const billingItems = billingTypesConfig?.filter(t => t.is_active).map(type => ({
      id: `billing_${type.code}`,
      label: type.label,
    })) || [
      { id: "billing_one_time", label: "Único" },
      { id: "billing_recurring", label: "Recorrente" },
    ];

    // Build category items dynamically (inside useMemo to prevent duplication)
    const validCategories = categories?.filter(
      (cat): cat is string => typeof cat === "string" && cat.length > 0
    ) || [];

    const groups: FilterGroup[] = [
      {
        id: "type",
        label: "Tipo",
        icon: <Layers className="h-4 w-4" />,
        defaultOpen: true,
        items: typeItems,
      },
      {
        id: "status",
        label: "Estado",
        icon: <Tag className="h-4 w-4" />,
        defaultOpen: true,
        items: [
          { id: "status_active", label: "Ativos" },
          { id: "status_archived", label: "Arquivados" },
        ],
      },
    ];

    // Add categories if they exist
    if (validCategories.length > 0) {
      groups.push({
        id: "category",
        label: "Categoria",
        icon: <Tag className="h-4 w-4" />,
        defaultOpen: false,
        items: validCategories.map((cat) => ({
          id: `cat_${cat}`,
          label: cat,
        })),
      });
    }

    // Add remaining groups
    groups.push(
      {
        id: "billing",
        label: "Cobrança",
        icon: <CircleDollarSign className="h-4 w-4" />,
        defaultOpen: false,
        items: billingItems,
      },
      {
        id: "smart",
        label: "Filtros Inteligentes",
        icon: <Calendar className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: "smart_recent", label: "Atualizados recentemente" },
          { id: "smart_high_price", label: "Preço alto (>100€)" },
          { id: "smart_low_price", label: "Preço baixo (<50€)" },
        ],
      }
    );

    return groups;
  }, [productTypesConfig, billingTypesConfig, categories]);

  // Filter and search - apply all filters including smart filters and billing
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let result = products;
    
    // Apply search filter
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower)
      );
    }
    
    // Apply smart filters (local filtering)
    if (activeFilterId?.startsWith("smart_")) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      switch (activeFilterId) {
        case "smart_recent":
          result = result.filter((p) => {
            const updated = new Date(p.updated_at);
            return updated >= sevenDaysAgo;
          });
          break;
        case "smart_high_price":
          result = result.filter((p) => (p.base_price || 0) > 100);
          break;
        case "smart_low_price":
          result = result.filter((p) => (p.base_price || 0) < 50);
          break;
      }
    }
    
    // Apply billing type filter (local filtering since API doesn't support it)
    if (activeFilterId?.startsWith("billing_")) {
      const billingCode = activeFilterId.replace("billing_", "");
      result = result.filter((p) => p.billing_type === billingCode);
    }
    
    return result;
  }, [products, searchValue, activeFilterId]);

  // Pagination
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const filtersActive = statusFilter !== "active" || typeFilter !== "all" || categoryFilter !== "all" || !!activeFilterId;

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  // Render cell content based on column id
  const renderProductCell = (product: Product, columnId: string, onOpenDetail: (product: Product) => void) => {
    switch (columnId) {
      case "name":
        return (
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="flex items-center gap-2 font-medium text-left hover:text-primary hover:underline transition-colors"
          >
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-8 h-8 rounded object-cover"
              />
            )}
            {product.name}
          </button>
        );
      case "sku":
        return product.sku ? (
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            {product.sku}
          </button>
        ) : "-";
      case "product_type":
        return (
          <Badge variant="outline">
            {getProductTypeLabel(product.product_type)}
          </Badge>
        );
      case "category":
        return product.category ? (
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="hover:text-primary hover:underline transition-colors"
          >
            {product.category}
          </button>
        ) : "-";
      case "base_price":
        return formatCurrency(product.base_price, product.currency);
      case "direct_cost":
        return product.direct_cost ? formatCurrency(product.direct_cost, product.currency) : "-";
      case "operational_cost":
        return product.operational_cost ? formatCurrency(product.operational_cost, product.currency) : "-";
      case "margin":
        if (product.base_price && product.direct_cost) {
          const margin = ((product.base_price - product.direct_cost) / product.base_price) * 100;
          return (
            <span className={margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-destructive"}>
              {margin.toFixed(1)}%
            </span>
          );
        }
        return "-";
      case "billing_type":
        return getBillingTypeLabel(product.billing_type);
      case "billing_frequency":
        return product.billing_frequency || "-";
      case "status":
        return (
          <Badge variant={product.status === "active" ? "default" : "secondary"}>
            {productStatusLabels[product.status]}
          </Badge>
        );
      case "b2b_published":
        return (product as any).b2b_published !== false ? (
          <Badge variant="outline" className="text-green-600 border-green-300">
            Publicado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Oculto
          </Badge>
        );
      case "total_units":
        return product.total_units ?? "-";
      case "unit_duration":
        return product.unit_duration ? `${product.unit_duration} min` : "-";
      case "validity_days":
        return product.validity_days ? `${product.validity_days} dias` : "-";
      case "tax_rate_estimate_pct":
        return product.tax_rate_estimate_pct ? `${product.tax_rate_estimate_pct}%` : "-";
      case "commission_default":
        return product.commission_default ? `${product.commission_default}%` : "-";
      case "delivery_mode":
        return product.delivery_mode || "-";
      case "created_at":
        return format(new Date(product.created_at), "dd/MM/yyyy", { locale: pt });
      case "updated_at":
        return format(new Date(product.updated_at), "dd/MM/yyyy", { locale: pt });
      default:
        return "-";
    }
  };

  const handleArchive = async (product: Product) => {
    await archiveProduct.mutateAsync({
      id: product.id,
      archive: product.status === "active",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProduct) return;
    await deleteProduct.mutateAsync(deleteConfirmProduct.id);
    setDeleteConfirmProduct(null);
  };

  const handleFilterSelect = (filterId: string) => {
    // Toggle off if clicking the same filter
    if (activeFilterId === filterId) {
      setActiveFilterId(undefined);
      // Reset the corresponding filter
      if (filterId.startsWith("type_")) {
        setTypeFilter("all");
      } else if (filterId.startsWith("status_")) {
        setStatusFilter("active");
      } else if (filterId.startsWith("cat_")) {
        setCategoryFilter("all");
      } else if (filterId.startsWith("smart_")) {
        // Reset smart filters
      }
      return;
    }

    setActiveFilterId(filterId);
    // Apply filter logic based on filterId
    if (filterId.startsWith("type_")) {
      const type = filterId.replace("type_", "");
      setTypeFilter(type);
    } else if (filterId.startsWith("status_")) {
      const status = filterId.replace("status_", "");
      setStatusFilter(status);
    } else if (filterId.startsWith("cat_")) {
      const cat = filterId.replace("cat_", "");
      setCategoryFilter(cat);
    } else if (filterId.startsWith("smart_")) {
      // Handle smart filters locally
    }
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setStatusFilter("active");
    setTypeFilter("all");
    setCategoryFilter("all");
    setSearchValue("");
    setDebouncedSearch("");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkExport = () => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    const csv = [
      ["Nome", "Tipo", "Categoria", "Preço", "Cobrança", "Estado"].join(","),
      ...selected.map((p) =>
        [
          p.name,
          getProductTypeLabel(p.product_type),
          p.category || "",
          p.base_price,
          getBillingTypeLabel(p.billing_type),
          productStatusLabels[p.status],
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success(`${selected.length} produtos exportados`);
  };

  const handleBulkArchive = async () => {
    const selected = products?.filter((p) => selectedIds.includes(p.id)) || [];
    if (selected.length === 0) return;
    for (const p of selected) {
      await archiveProduct.mutateAsync({ id: p.id, archive: true });
    }
    setSelectedIds([]);
    toast.success(`${selected.length} produtos arquivados`);
  };


  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar - only show on products tab */}
      {activeTab === "products" && (
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={() => {
            setActiveFilterId(undefined);
            setStatusFilter("active");
            setTypeFilter("all");
            setCategoryFilter("all");
          }}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Produtos"
          count={activeTab === "products" ? totalProducts : undefined}
          description="Gerencie os seus produtos e serviços"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={activeTab === "products" ? [
            {
              label: "Importar SKUs",
              icon: <Upload className="h-4 w-4" />,
              onClick: () => setBatchImportOpen(true),
              variant: "outline" as const,
            },
            {
              label: "Criar Produto",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setCreateOpen(true),
            },
          ] : undefined}
        />

        {/* Products Tab Content */}
        {activeTab === "products" && (
          <>
            {/* Toolbar */}
            <Toolbar
              searchValue={searchValue}
              searchPlaceholder="Pesquisar produtos..."
              onSearchChange={(value) => {
                setSearchValue(value);
                // Debounce for API
                setTimeout(() => setDebouncedSearch(value), 300);
              }}
              showFilters={true}
              filtersActive={filtersActive}
              onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
              onClearFilters={handleClearFilters}
              sortOptions={sortOptions}
              sortValue={sortValue}
              onSortChange={setSortValue}
              leftActions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                  className="gap-2"
                >
                  {showFilterSidebar ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
              }
              rightActions={
                <div className="flex items-center gap-2">
                  <ColumnSelector
                    columns={PRODUCT_COLUMNS}
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    onVisibleColumnsChange={setVisibleColumns}
                    onColumnOrderChange={setColumnOrder}
                    storageKey="products-table-columns"
                  />
                  <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              }
            />

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
                </span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkArchive} className="gap-2">
                  <Archive className="h-4 w-4" />
                  Arquivar
                </Button>
              </div>
            )}

            {/* Table */}
            <Card className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : !paginatedProducts?.length ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Ainda não tens produtos.</h3>
                  <p className="text-sm mb-4">
                    Cria o primeiro produto para usares em propostas e negócios.
                  </p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Produto
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            paginatedProducts.length > 0 &&
                            paginatedProducts.every((p) => selectedIds.includes(p.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      {columnOrder
                        .filter((colId) => visibleColumns.has(colId))
                        .map((colId) => {
                          const col = PRODUCT_COLUMNS.find((c) => c.id === colId);
                          if (!col) return null;
                          return <TableHead key={col.id}>{col.label}</TableHead>;
                        })}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(product.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(product.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        {columnOrder
                          .filter((colId) => visibleColumns.has(colId))
                          .map((colId) => (
                            <TableCell key={colId}>
                              {renderProductCell(product, colId, setDetailProduct)}
                            </TableCell>
                          ))}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailProduct(product)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditProduct(product)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(product)}>
                                {product.status === "active" ? (
                                  <>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Arquivar
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirmProduct(product)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Categories Tab Content */}
        {activeTab === "categories" && <CategoriesTabContent />}

        {/* Pricing Tab Content */}
        {activeTab === "pricing" && <PricingTabContent />}

        {/* Settings Tab Content */}
        {activeTab === "settings" && <ProductSettingsTabContent />}
      </div>

      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />

      <CreateProductDialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        product={editProduct ?? undefined}
      />

      {detailProduct && (
        <ProductDetailDialog
          open={!!detailProduct}
          onOpenChange={(open) => !open && setDetailProduct(null)}
          productId={detailProduct.id}
        />
      )}

      <BatchSKUImportDialog
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deleteConfirmProduct} 
        onOpenChange={(open) => !open && setDeleteConfirmProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar o produto "{deleteConfirmProduct?.name}"? 
              Esta ação é irreversível e irá remover permanentemente o produto do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
