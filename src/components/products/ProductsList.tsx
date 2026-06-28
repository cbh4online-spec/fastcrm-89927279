import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Plus, PanelLeft, PanelLeftClose, Store, RefreshCw,
  Upload, ScanLine, Columns, AlertTriangle, Trash2,
  Package, Repeat, FileBox, Tag, CircleDollarSign,
  Calendar, Layers, Download, ScanText,
} from "lucide-react";
import { Toolbar } from "@/components/common/Toolbar";
import { BarcodeScannerModal } from "@/components/barcode/BarcodeScannerModal";
import { BarcodeResultPanel } from "@/components/barcode/BarcodeResultPanel";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductDetailDialog } from "./ProductDetailDialog";
import { BatchSKUImportDialog } from "./BatchSKUImportDialog";
import { CategoriesTabContent } from "./CategoriesTabContent";
import { PricingTabContent } from "./PricingTabContent";
import { ProductSettingsTabContent } from "./settings/ProductSettingsTabContent";
import { ColumnSelector } from "@/components/common/ColumnSelector";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";

// Sub-components
import { ProductBulkActions } from "./table/ProductBulkActions";
import { ProductsDataTable } from "./table/ProductsDataTable";
import { ProductsPagination } from "./table/ProductsPagination";
import { ProductsExportDialog } from "./ProductsExportDialog";
import { ProductComparisonSheet } from "./ProductComparisonSheet";
import { LayoutPresetsManager, type LayoutPreset } from "./table/LayoutPresetsManager";
import { ProductImportWizard } from "./ProductImportWizard";
import { BundlesManager } from "./BundlesManager";
import { PricingRulesManager } from "./PricingRulesManager";
import { StockAlertsManager } from "./StockAlertsManager";
import { ProductReportsTab } from "./ProductReportsTab";
import { ProductsCatalogSummary } from "./ProductsCatalogSummary";
import { PricingHealthDashboard } from "./pricing/PricingHealthDashboard";
import { useProductsListState, PRODUCT_COLUMNS, pageTabs, sortOptions } from "./hooks/useProductsListState";
import { useCanViewCostMargin, COST_MARGIN_FIELDS } from "@/hooks/useCanViewCostMargin";
import { usePricingRules } from "@/hooks/useProductPricingIntelligence";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileProductsView } from "./mobile/MobileProductsView";
import { MobileProductDetailSheet } from "./mobile/MobileProductDetailSheet";

export function ProductsList() {
  const navigate = useNavigate();
  const state = useProductsListState();
  const { data: pricingRules = [] } = usePricingRules();
  const [exportOpen, setExportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const isMobile = useIsMobile();
  const canViewCostMargin = useCanViewCostMargin();

  // Colunas e filtros sensíveis (custo/margem) ocultos para roles sem permissão
  const visibleProductColumns = useMemo(
    () => canViewCostMargin
      ? PRODUCT_COLUMNS
      : PRODUCT_COLUMNS.filter((c) => !COST_MARGIN_FIELDS.has(c.id)),
    [canViewCostMargin]
  );
  const effectiveVisibleColumnsSet = useMemo(() => {
    if (canViewCostMargin) return state.visibleColumns;
    const next = new Set(state.visibleColumns);
    COST_MARGIN_FIELDS.forEach((f) => next.delete(f));
    return next;
  }, [canViewCostMargin, state.visibleColumns]);
  const effectiveColumnOrder = useMemo(
    () => canViewCostMargin
      ? state.columnOrder
      : state.columnOrder.filter((c) => !COST_MARGIN_FIELDS.has(c)),
    [canViewCostMargin, state.columnOrder]
  );

  const goToMobileQuickCreate = useCallback((barcode?: string) => {
    const path = barcode
      ? `/dashboard/products/quick-create?barcode=${encodeURIComponent(barcode)}`
      : "/dashboard/products/quick-create";
    navigate(path);
  }, [navigate]);

  const comparisonProducts = useMemo(() => {
    if (!state.products) return [];
    return state.products.filter(p => state.selectedIds.includes(p.id));
  }, [state.products, state.selectedIds]);

  const handleApplyPreset = useCallback((preset: LayoutPreset) => {
    state.setVisibleColumns(new Set(preset.visibleColumns));
    state.setColumnOrder(preset.columnOrder);
    if (Object.keys(preset.columnWidths).length > 0) {
      Object.entries(preset.columnWidths).forEach(([col, w]) => state.colWidths.setWidth(col, w));
    }
  }, [state.setVisibleColumns, state.setColumnOrder, state.colWidths]);

  // --- Filter groups for sidebar ---
  const filterGroups: FilterGroup[] = useMemo(() => {
    const typeItems = state.productTypesConfig?.filter(t => t.is_active).map(type => ({
      id: `type_${type.code}`,
      label: type.label,
      icon: <Package className="h-4 w-4" />
    })) || [
      { id: "type_simple", label: "Simples", icon: <Package className="h-4 w-4" /> },
      { id: "type_recurring", label: "Recorrente", icon: <Repeat className="h-4 w-4" /> },
      { id: "type_composite", label: "Bundle", icon: <FileBox className="h-4 w-4" /> },
    ];

    const billingItems = state.billingTypesConfig?.filter(t => t.is_active).map(type => ({
      id: `billing_${type.code}`,
      label: type.label,
    })) || [
      { id: "billing_one_time", label: "Único" },
      { id: "billing_recurring", label: "Recorrente" },
    ];

    const validCategories = state.categories?.filter(
      (cat): cat is string => typeof cat === "string" && cat.length > 0
    ) || [];

    const groups: FilterGroup[] = [
      {
        id: "type", label: "Tipo", icon: <Layers className="h-4 w-4" />,
        defaultOpen: true, items: typeItems,
      },
      {
        id: "status", label: "Estado", icon: <Tag className="h-4 w-4" />,
        defaultOpen: true,
        items: [
          { id: "status_active", label: "Ativos" },
          { id: "status_archived", label: "Arquivados" },
        ],
      },
      {
        id: "store", label: "Loja Online", icon: <Store className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: "store_yes", label: "Publicados na Loja" },
          { id: "store_no", label: "Não publicados" },
        ],
      },
    ];

    if (validCategories.length > 0) {
      groups.push({
        id: "category", label: "Categoria", icon: <Tag className="h-4 w-4" />,
        defaultOpen: false,
        items: validCategories.map((cat) => ({ id: `cat_${cat}`, label: cat })),
      });
    }

    const tagItems = ((state.workspaceTags || []) as string[]).map((t: string) => ({
      id: `tag_${t}`, label: t,
    }));
    if (tagItems.length > 0) {
      groups.push({
        id: "tags", label: "Tags", icon: <Tag className="h-4 w-4" />,
        defaultOpen: false, items: tagItems,
      });
    }

    groups.push(
      {
        id: "billing", label: "Cobrança", icon: <CircleDollarSign className="h-4 w-4" />,
        defaultOpen: false, items: billingItems,
      },
      {
        id: "smart", label: "Filtros Inteligentes", icon: <Calendar className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: "smart_recent", label: "Atualizados recentemente" },
          { id: "smart_high_price", label: "Preço alto (>100€)" },
          { id: "smart_low_price", label: "Preço baixo (<50€)" },
          { id: "smart_invalid_sku", label: "⚠️ SKUs inválidos" },
          { id: "smart_no_price", label: "🔴 Sem preço definido" },
          ...(canViewCostMargin ? [
            { id: "smart_no_cost", label: "🟡 Sem custo definido" },
            { id: "smart_negative_margin", label: "🔴 Margem negativa" },
            { id: "smart_low_margin", label: "🟡 Margem baixa (<15%)" },
          ] : []),
          { id: "smart_no_image", label: "📷 Sem imagem" },
          { id: "smart_no_sku", label: "Sem SKU" },
          { id: "smart_no_category", label: "Sem categoria" },
          { id: "smart_no_description", label: "Sem descrição" },
        ],
      }
    );

    return groups;
  }, [state.productTypesConfig, state.billingTypesConfig, state.categories, state.workspaceTags, canViewCostMargin]);

  // Mobile: vista dedicada para a tab "Produtos"
  if (isMobile && state.activeTab === "products") {
    return (
      <>
        <MobileProductsView
          products={state.filteredProducts}
          isLoading={state.isLoading}
          searchValue={state.searchValue}
          onSearchChange={state.setSearchValue}
          formatCurrency={state.formatCurrency}
          getProductTypeLabel={state.getProductTypeLabel}
          totalCount={state.totalProducts}
          onOpenProduct={(p) => state.setDetailProduct(p)}
          onEditProduct={(p) => state.setEditProduct(p)}
          onArchiveProduct={(p) => state.handleArchive(p)}
          onDeleteProduct={(p) => state.setDeleteConfirmProduct(p)}
          onCreate={() => goToMobileQuickCreate()}
          onScan={() => state.setScannerOpen(true)}
          onRefresh={() => state.refetch()}
        />

        {/* Dialogs partilhados */}
        <CreateProductDialog open={state.createOpen} onOpenChange={state.setCreateOpen} />
        <CreateProductDialog
          open={!!state.editProduct}
          onOpenChange={(open) => !open && state.setEditProduct(null)}
          product={state.editProduct ?? undefined}
        />
        <MobileProductDetailSheet
          productId={state.detailProduct?.id ?? null}
          open={!!state.detailProduct}
          onClose={() => state.setDetailProduct(null)}
          onEdit={() => {
            const p = state.detailProduct;
            state.setDetailProduct(null);
            if (p) state.setEditProduct(p);
          }}
          onArchive={() => {
            if (state.detailProduct) {
              state.handleArchive(state.detailProduct);
              state.setDetailProduct(null);
            }
          }}
          formatCurrency={state.formatCurrency}
        />
        <BatchSKUImportDialog open={state.batchImportOpen} onOpenChange={state.setBatchImportOpen} />

        <AlertDialog
          open={!!state.deleteConfirmProduct}
          onOpenChange={(open) => !open && state.setDeleteConfirmProduct(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar produto?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que pretende eliminar "{state.deleteConfirmProduct?.name}"?
                Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={state.handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BarcodeScannerModal
          open={state.scannerOpen}
          onOpenChange={state.setScannerOpen}
          onScan={state.handleBarcodeScan}
        />
        <BarcodeResultPanel
          open={state.scanResultOpen}
          onOpenChange={(v) => { state.setScanResultOpen(v); if (!v) state.resetScan(); }}
          result={state.scanResult}
          barcode={state.scannedBarcode}
          isLoading={state.scanLoading}
          onOpenProduct={(id) => {
            const p = state.products?.find(pr => pr.id === id);
            if (p) state.setDetailProduct(p);
          }}
          onQuickCreate={(barcode) => {
            state.setScanResultOpen(false);
            state.resetScan();
            goToMobileQuickCreate(barcode);
          }}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 -m-6">
      {/* Filter Sidebar */}
      {state.activeTab === "products" && (
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={state.activeFilterId}
          onFilterSelect={state.handleFilterSelect}
          onClearFilter={() => {
            state.handleClearFilters();
          }}
          isOpen={state.showFilterSidebar}
          onClose={() => state.setShowFilterSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        <div className="px-4 sm:px-8 pt-6 pb-5 bg-background">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Produtos</h1>
                {state.activeTab === "products" && typeof state.totalProducts === "number" && (
                  <Badge variant="secondary" className="rounded-full h-6 px-2.5 text-xs">{state.totalProducts}</Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">Gerencie os seus produtos e serviços</p>
            </div>
            {state.activeTab === "products" && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => state.setCreateOpen(true)}
                  className="h-10 gap-2 rounded-full px-5 font-semibold"
                >
                  <Plus className="h-4 w-4" /> Criar Produto
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-border bg-card" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/products/ocr-create")}>
                      <ScanText className="h-4 w-4 mr-2" /> Criar por OCR
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => state.setScannerOpen(true)}>
                      <ScanLine className="h-4 w-4 mr-2" /> Scan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setImportWizardOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Importar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => state.setBatchImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Importar SKUs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setExportOpen(true)}>
                      <Download className="h-4 w-4 mr-2" /> Exportar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        <IXEntityTabs
          tabs={pageTabs}
          activeId={state.activeTab}
          onChange={(id) => state.setActiveTab(id as typeof state.activeTab)}
        />

        <div className="px-4 sm:px-8 py-6 space-y-4">

        {state.activeTab === "products" && (
          <>
            <Toolbar
              searchValue={state.searchValue}
              searchPlaceholder="Pesquisar produtos..."
              onSearchChange={state.setSearchValue}
              showFilters={true}
              filtersActive={state.filtersActive}
              onToggleFilters={() => state.setShowFilterSidebar(!state.showFilterSidebar)}
              onClearFilters={state.handleClearFilters}
              sortOptions={sortOptions}
              sortValue={state.sortValue}
              onSortChange={state.setSortValue}
              searchInputRef={state.searchInputRef}
              leftActions={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => state.setShowFilterSidebar(!state.showFilterSidebar)} className="gap-2">
                    {state.showFilterSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  </Button>
                  {canViewCostMargin && state.productIndicators.noCost > 0 && (
                    <Button
                      variant={state.activeFilterId === "smart_no_cost" ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => state.handleFilterSelect("smart_no_cost")}
                      className={cn("gap-2", state.activeFilterId === "smart_no_cost" ? "bg-warning/10 text-warning border-warning/30" : "")}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="hidden sm:inline">Sem custo</span>
                      <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs">{state.productIndicators.noCost}</Badge>
                    </Button>
                  )}
                </div>
              }
              rightActions={
                <div className="hidden md:flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2"><Columns className="h-4 w-4" /> Largura</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const visibleColIds = state.columnOrder.filter(c => state.visibleColumns.has(c));
                        state.colWidths.autoFitAll(visibleColIds, state.tableRef);
                      }}>Ajustar automaticamente</DropdownMenuItem>
                      <DropdownMenuItem onClick={state.colWidths.resetWidths}>Repor larguras padrão</DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
                  <LayoutPresetsManager
                    visibleColumns={effectiveVisibleColumnsSet}
                    columnOrder={effectiveColumnOrder}
                    columnWidths={state.colWidths.widths}
                    onApplyPreset={handleApplyPreset}
                    storageKey="products-table-columns"
                  />
                  <ColumnSelector
                    columns={visibleProductColumns}
                    visibleColumns={effectiveVisibleColumnsSet}
                    columnOrder={effectiveColumnOrder}
                    onVisibleColumnsChange={state.setVisibleColumns}
                    onColumnOrderChange={state.setColumnOrder}
                    onResetWidths={state.colWidths.resetWidths}
                    storageKey="products-table-columns"
                  />
                  <Button variant="ghost" size="sm" onClick={() => state.refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              }
            />

            {state.products && state.products.length > 0 && (
              <ProductsCatalogSummary
                products={state.products}
                formatCurrency={state.formatCurrency}
                productIndicators={state.productIndicators}
                activeFilterId={state.activeFilterId}
                onFilterSelect={state.handleFilterSelect}
                canViewCostMargin={canViewCostMargin}
              />
            )}

            <ProductBulkActions
              selectedIds={state.selectedIds}
              bulkDeleteOpen={state.bulkDeleteOpen}
              setBulkDeleteOpen={state.setBulkDeleteOpen}
              bulkCostOpen={state.bulkCostOpen}
              setBulkCostOpen={state.setBulkCostOpen}
              onBulkExport={state.handleBulkExport}
              onBulkArchive={state.handleBulkArchive}
              onBulkDelete={() => state.deleteProductsBatch.mutateAsync(state.selectedIds)}
              onClearSelection={() => state.setSelectedIds([])}
              onBulkPublish={state.handleBulkPublish}
              onBulkDuplicate={state.handleBulkDuplicate}
              onCompare={() => setCompareOpen(true)}
            />

            <ProductsDataTable
              products={state.filteredProducts}
              isLoading={state.isLoading}
              selectedIds={state.selectedIds}
              onSelectAll={state.handleSelectAll}
              onSelectOne={state.handleSelectOne}
              onOpenDetail={state.setDetailProduct}
              onEdit={state.setEditProduct}
              onArchive={state.handleArchive}
              onDelete={state.setDeleteConfirmProduct}
              onCreate={() => state.setCreateOpen(true)}
              columnOrder={effectiveColumnOrder}
              visibleColumns={effectiveVisibleColumnsSet}
              colWidths={state.colWidths}
              tableRef={state.tableRef}
              getProductTypeLabel={state.getProductTypeLabel}
              getBillingTypeLabel={state.getBillingTypeLabel}
              formatCurrency={state.formatCurrency}
              toggleStorePublished={state.toggleStorePublished}
              onInlinePriceUpdate={(id, field, value) => state.updateProductPrice.mutate({ id, field, value })}
              isFilteredEmpty={state.filtersActive && state.filteredProducts.length === 0 && !state.isLoading}
              onClearFilters={state.handleClearFilters}
              pricingRules={pricingRules}
              productTypesConfig={state.productTypesConfig}
            />
          </>
        )}

        {state.activeTab === "categories" && <CategoriesTabContent />}
        {state.activeTab === "pricing" && <PricingTabContent />}
        {state.activeTab === "bundles" && <BundlesManager />}
        {state.activeTab === "pricing-rules" && <PricingRulesManager />}
        {state.activeTab === "stock-alerts" && <StockAlertsManager />}
        {state.activeTab === "reports" && <ProductReportsTab />}
        {state.activeTab === "health" && <PricingHealthDashboard />}
        {state.activeTab === "settings" && <ProductSettingsTabContent />}
        </div>
      </div>

      {/* Dialogs */}
      <CreateProductDialog open={state.createOpen} onOpenChange={state.setCreateOpen} />
      <CreateProductDialog
        open={!!state.editProduct}
        onOpenChange={(open) => !open && state.setEditProduct(null)}
        product={state.editProduct ?? undefined}
      />
      {state.detailProduct && (
        <ProductDetailDialog
          open={!!state.detailProduct}
          onOpenChange={(open) => !open && state.setDetailProduct(null)}
          productId={state.detailProduct.id}
        />
      )}
      <BatchSKUImportDialog open={state.batchImportOpen} onOpenChange={state.setBatchImportOpen} />
      <ProductImportWizard open={importWizardOpen} onOpenChange={setImportWizardOpen} />
      <ProductsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        products={state.products || []}
        filteredProducts={state.filteredProducts}
        formatCurrency={state.formatCurrency}
        getProductTypeLabel={state.getProductTypeLabel}
        getBillingTypeLabel={state.getBillingTypeLabel}
      />
      <ProductComparisonSheet
        open={compareOpen}
        onOpenChange={setCompareOpen}
        products={comparisonProducts}
        formatCurrency={state.formatCurrency}
        getProductTypeLabel={state.getProductTypeLabel}
        getBillingTypeLabel={state.getBillingTypeLabel}
      />

      <AlertDialog
        open={!!state.deleteConfirmProduct}
        onOpenChange={(open) => !open && state.setDeleteConfirmProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar o produto "{state.deleteConfirmProduct?.name}"?
              Esta ação é irreversível e irá remover permanentemente o produto do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={state.handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BarcodeScannerModal open={state.scannerOpen} onOpenChange={state.setScannerOpen} onScan={state.handleBarcodeScan} />
      <BarcodeResultPanel
        open={state.scanResultOpen}
        onOpenChange={(v) => { state.setScanResultOpen(v); if (!v) state.resetScan(); }}
        result={state.scanResult}
        barcode={state.scannedBarcode}
        isLoading={state.scanLoading}
        onOpenProduct={(id) => {
          const p = state.products?.find(pr => pr.id === id);
          if (p) state.setDetailProduct(p);
        }}
        onQuickCreate={(barcode) => {
          state.setScanResultOpen(false);
          state.resetScan();
          goToMobileQuickCreate(barcode);
        }}
      />
    </div>
  );
}
