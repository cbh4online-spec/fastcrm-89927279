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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Calendar,
  Tag,
  CircleDollarSign,
  Repeat,
  FileBox,
  Clock,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProducts, useProductCategories, useArchiveProduct } from "@/hooks/useProducts";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductDetailDialog } from "./ProductDetailDialog";
import { BatchSKUImportDialog } from "./BatchSKUImportDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
  type Product,
} from "@/types/product";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const pageTabs = [
  { id: "products", label: "Produtos" },
  { id: "categories", label: "Categorias" },
  { id: "pricing", label: "Tabelas de Preço" },
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
  const [search, setSearch] = useState("");
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

  const { data: products, isLoading, refetch } = useProducts({
    status: statusFilter,
    productType: typeFilter,
    category: categoryFilter,
    search: search || undefined,
  });

  const { data: categories } = useProductCategories();
  const archiveProduct = useArchiveProduct();

  // Filter groups for sidebar
  const filterGroups: FilterGroup[] = [
    {
      id: "type",
      label: "Tipo",
      icon: <Layers className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: "type_simple", label: "Simples", icon: <Package className="h-4 w-4" /> },
        { id: "type_recurring", label: "Recorrente", icon: <Repeat className="h-4 w-4" /> },
        { id: "type_composite", label: "Bundle", icon: <FileBox className="h-4 w-4" /> },
        { id: "type_sessions", label: "Sessões", icon: <Clock className="h-4 w-4" /> },
      ],
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
    {
      id: "billing",
      label: "Cobrança",
      icon: <CircleDollarSign className="h-4 w-4" />,
      defaultOpen: false,
      items: [
        { id: "billing_one_time", label: "Único" },
        { id: "billing_monthly", label: "Mensal" },
        { id: "billing_quarterly", label: "Trimestral" },
        { id: "billing_yearly", label: "Anual" },
      ],
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
    },
  ];

  // Add category filter group if categories exist
  if (categories && categories.length > 0) {
    filterGroups.splice(2, 0, {
      id: "category",
      label: "Categoria",
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: false,
      items: categories.map((cat) => ({
        id: `cat_${cat}`,
        label: cat,
      })),
    });
  }

  // Filter and search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchValue) return products;
    const lower = searchValue.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(lower) ||
        p.sku?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
    );
  }, [products, searchValue]);

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

  const handleArchive = async (product: Product) => {
    await archiveProduct.mutateAsync({
      id: product.id,
      archive: product.status === "active",
    });
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    // Apply filter logic based on filterId
    if (filterId.startsWith("type_")) {
      setTypeFilter(filterId.replace("type_", ""));
    } else if (filterId.startsWith("status_")) {
      setStatusFilter(filterId.replace("status_", ""));
    } else if (filterId.startsWith("cat_")) {
      setCategoryFilter(filterId.replace("cat_", ""));
    }
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
          productTypeLabels[p.product_type],
          p.category || "",
          p.base_price,
          billingTypeLabels[p.billing_type],
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
      {/* Filter Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Produtos"
          count={totalProducts}
          description="Gerencie os seus produtos e serviços"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
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
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar produtos..."
          onSearchChange={setSearchValue}
          showFilters={true}
          filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => {
            setActiveFilterId(undefined);
            setStatusFilter("active");
            setTypeFilter("all");
            setCategoryFilter("all");
          }}
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
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Atualizado</TableHead>
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
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {productTypeLabels[product.product_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.category || "-"}</TableCell>
                    <TableCell>
                      {formatCurrency(product.base_price, product.currency)}
                    </TableCell>
                    <TableCell>{billingTypeLabels[product.billing_type]}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                      >
                        {productStatusLabels[product.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(product.updated_at), "dd/MM/yyyy", {
                        locale: pt,
                      })}
                    </TableCell>
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
    </div>
  );
}
