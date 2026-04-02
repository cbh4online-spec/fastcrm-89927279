import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  Edit,
  Archive,
  RotateCcw,
  Loader2,
  DollarSign,
  History,
  Layers,
  Info,
  Clock,
  BarChart3,
  RefreshCw,
  Calendar,
  CheckCircle,
  Trash2,
  ClipboardList,
  Video,
  Link2,
  FileText,
  TrendingUp,
  ImageIcon,
} from "lucide-react";
import { LocationMapEmbed } from "./LocationMapEmbed";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProduct, useUpdateProduct, useArchiveProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useProductStats, generateProductAlerts } from "@/hooks/useProductStats";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
  consumptionModelLabels,
  recommendedFrequencyLabels,
} from "@/types/product";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductFinancialSection } from "./ProductFinancialSection";
import { ProductKPICards } from "./ProductKPICards";
import { ProductUsageHistory } from "./ProductUsageHistory";
import { ProductAlerts } from "./ProductAlerts";
import { BundleComponentsTab } from "./BundleComponentsTab";
import { SessionsTab } from "./SessionsTab";
import { ProductImagesGallery } from "./ProductImagesGallery";
import { ProductProgressionsTab } from "./ProductProgressionsTab";
import { ProductCyclesTabEnhanced } from "./ProductCyclesTabEnhanced";
import { ProductSheetSettings } from "./ProductSheetSettings";
import { ProductVideoPreview } from "./ProductVideoPreview";
import { ProductRelationsTab } from "./ProductRelationsTab";
import { ProductDeliverablesManager } from "./ProductDeliverablesManager";
import { ProductDocumentsTab } from "./ProductDocumentsTab";
import { ProductSpecsTab } from "./ProductSpecsTab";
import { ProductStockTab } from "./ProductStockTab";
import { ProductAnalyticsTab } from "./ProductAnalyticsTab";
import { ProductLifecycleTab } from "./ProductLifecycleTab";
import { ProductBarcodeQRSection } from "./ProductBarcodeQRSection";
import { ProductTagsEditor } from "./ProductTagsEditor";
import { ProductPriceHistoryTab } from "./ProductPriceHistoryTab";
import { useProductImages } from "@/hooks/useProductImages";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  productId,
}: ProductDetailDialogProps) {
  const [tab, setTab] = useState("details");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: product, isLoading } = useProduct(productId);
  const { data: stats } = useProductStats(productId);
  const { data: productImages } = useProductImages(productId);
  const { data: storeSettings } = useStoreSettings();
  const { currentWorkspace } = useWorkspace();
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();
  const deleteProduct = useDeleteProduct();

  const [heroIdx, setHeroIdx] = useState(0);
  const mainImage = productImages?.[heroIdx];

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleArchive = async () => {
    if (!product) return;
    await archiveProduct.mutateAsync({
      id: product.id,
      archive: product.status === "active",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!product) return;
    await deleteProduct.mutateAsync(product.id);
    setDeleteOpen(false);
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return null;
  }

  const isBundle = product.product_type === "composite";
  const isSessions = product.product_type === "sessions";
  const alerts = generateProductAlerts(product, stats);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <TooltipProvider delayDuration={200}>
            {/* ═══ HERO HEADER — compacto ═══ */}
            <div className="relative bg-gradient-to-br from-muted/80 via-muted/40 to-background">
              <div className="flex flex-col sm:flex-row gap-0">
                {/* Image area — reduzido para 180px */}
                <div className="relative w-full sm:w-[240px] h-[180px] sm:h-[180px] shrink-0 bg-muted/60 overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage.url}
                      alt={mainImage.alt_text || product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-14 w-14 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Mini gallery thumbnails */}
                  {productImages && productImages.length > 1 && (
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1 overflow-x-auto">
                      {productImages.slice(0, 5).map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setHeroIdx(idx)}
                          className={`w-8 h-8 rounded overflow-hidden border-2 shrink-0 transition-all ${
                            idx === heroIdx ? "border-primary shadow-md" : "border-white/50 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info area */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Logo + brand — compacto */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <WorkspaceLogo
                        logoUrl={storeSettings?.logo_url}
                        workspaceName={storeSettings?.store_name || currentWorkspace?.name}
                        size="sm"
                        variant="portal"
                      />
                      <span className="text-xs text-muted-foreground font-medium truncate">
                        {storeSettings?.store_name || currentWorkspace?.name}
                      </span>
                    </div>

                    <DialogHeader className="text-left">
                      <DialogTitle className="text-lg leading-tight">{product.name}</DialogTitle>
                    </DialogHeader>

                    {/* Badges + Price + SKU — tudo numa zona compacta */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant={isBundle ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                        {productTypeLabels[product.product_type]}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                        product.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : product.status === "review" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : product.status === "discontinued" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {productStatusLabels[product.status]}
                      </Badge>
                      {product.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category}</Badge>}
                    </div>

                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(product.base_price, product.currency)}
                      </span>
                      {product.direct_cost !== null && (
                        <span className="text-xs text-muted-foreground">
                          Margem {((product.base_price - product.direct_cost) / product.base_price * 100).toFixed(0)}%
                        </span>
                      )}
                      {product.sku && (
                        <span className="text-[10px] font-mono text-muted-foreground">SKU: {product.sku}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — ícones com tooltips */}
                  <div className="flex gap-1.5 mt-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleArchive}>
                          {product.status === "active" ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{product.status === "active" ? "Arquivar" : "Reativar"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[calc(90vh-180px)]">
              <div className="px-5 pb-5 space-y-4">
                {/* Bundle warning */}
                {isBundle && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Alterações neste bundle não afetam vendas passadas. Os snapshots históricos são imutáveis.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerts */}
                {alerts.length > 0 && <ProductAlerts alerts={alerts} />}

                {/* KPI Cards */}
                <ProductKPICards productId={productId} currency={product.currency} />

                <Tabs value={tab} onValueChange={setTab}>
                  {/* ═══ TABS — duas linhas lógicas ═══ */}
                  <div className="space-y-1">
                    {/* Linha 1 — Core */}
                    <TabsList className="h-auto flex-wrap gap-0.5 bg-muted/60 p-1">
                      <TabsTrigger value="details" className="text-xs px-2.5 py-1 h-7">Detalhes</TabsTrigger>
                      {isBundle && (
                        <TabsTrigger value="components" className="text-xs px-2.5 py-1 h-7">
                          <Layers className="h-3 w-3 mr-1" />Componentes
                        </TabsTrigger>
                      )}
                      {isSessions && (
                        <TabsTrigger value="sessions" className="text-xs px-2.5 py-1 h-7">
                          <Clock className="h-3 w-3 mr-1" />Pacotes
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="financial" className="text-xs px-2.5 py-1 h-7">
                        <DollarSign className="h-3 w-3 mr-1" />Financeiro
                      </TabsTrigger>
                      <TabsTrigger value="usage" className="text-xs px-2.5 py-1 h-7">
                        <History className="h-3 w-3 mr-1" />Histórico
                      </TabsTrigger>
                      <TabsTrigger value="images" className="text-xs px-2.5 py-1 h-7">Imagens</TabsTrigger>
                      <TabsTrigger value="progressions" className="text-xs px-2.5 py-1 h-7">Progressões</TabsTrigger>
                      <TabsTrigger value="cycles" className="text-xs px-2.5 py-1 h-7">Ciclos</TabsTrigger>
                      <TabsTrigger value="sheet" className="text-xs px-2.5 py-1 h-7">Ficha</TabsTrigger>
                    </TabsList>

                    {/* Linha 2 — Avançado */}
                    <TabsList className="h-auto flex-wrap gap-0.5 bg-muted/40 p-1">
                      <TabsTrigger value="relations" className="text-xs px-2.5 py-1 h-7">
                        <Link2 className="h-3 w-3 mr-1" />Relações
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="text-xs px-2.5 py-1 h-7">
                        <FileText className="h-3 w-3 mr-1" />Documentos
                      </TabsTrigger>
                      <TabsTrigger value="specs" className="text-xs px-2.5 py-1 h-7">
                        <ClipboardList className="h-3 w-3 mr-1" />Specs
                      </TabsTrigger>
                      <TabsTrigger value="stock" className="text-xs px-2.5 py-1 h-7">
                        <Package className="h-3 w-3 mr-1" />Stock
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="text-xs px-2.5 py-1 h-7">
                        <BarChart3 className="h-3 w-3 mr-1" />Analytics
                      </TabsTrigger>
                      <TabsTrigger value="lifecycle" className="text-xs px-2.5 py-1 h-7">
                        <Clock className="h-3 w-3 mr-1" />Ciclo de Vida
                      </TabsTrigger>
                      <TabsTrigger value="deliverables" className="text-xs px-2.5 py-1 h-7">
                        <Package className="h-3 w-3 mr-1" />Entregáveis
                      </TabsTrigger>
                      <TabsTrigger value="price-history" className="text-xs px-2.5 py-1 h-7">
                        <TrendingUp className="h-3 w-3 mr-1" />Preços
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* ═══ TAB CONTENTS ═══ */}
                  <TabsContent value="details" className="mt-4 space-y-4">
                    {/* Price/Cost cards side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">
                          {isBundle ? "Preço do Bundle" : "Preço Base"}
                        </p>
                        <p className="text-xl font-bold mt-0.5">
                          {formatCurrency(product.base_price, product.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {billingTypeLabels[product.billing_type]}
                          {isBundle && product.bundle_price_mode && (
                            <> • {product.bundle_price_mode === "auto" ? "Automático" : "Manual"}</>
                          )}
                        </p>
                      </Card>

                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">
                          {isBundle ? "Custo Total" : "Custo Direto"}
                        </p>
                        {product.direct_cost !== null ? (
                          <>
                            <p className="text-xl font-semibold mt-0.5">
                              {formatCurrency(product.direct_cost, product.currency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Margem: {((product.base_price - product.direct_cost) / product.base_price * 100).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">Não definido</p>
                        )}
                      </Card>
                    </div>

                    {/* Metadata grid — tabela limpa */}
                    <Card className="p-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        {product.sku && (
                          <>
                            <p className="text-muted-foreground text-xs">SKU</p>
                            <p className="font-mono text-xs">{product.sku}</p>
                          </>
                        )}
                        {product.commission_default !== null && (
                          <>
                            <p className="text-muted-foreground text-xs">Comissão</p>
                            <p className="text-xs">{product.commission_default}%</p>
                          </>
                        )}
                        <p className="text-muted-foreground text-xs">Criado</p>
                        <p className="text-xs">
                          {format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </p>
                        <p className="text-muted-foreground text-xs">Atualizado</p>
                        <p className="text-xs">
                          {format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </Card>

                    {/* Barcode & QR Code — compacto */}
                    <ProductBarcodeQRSection
                      productId={product.id}
                      barcode={(product as any).barcode}
                      sku={product.sku}
                      sheetSlug={product.sheet_slug}
                      sheetPublished={product.sheet_published}
                    />

                    {product.short_description && (
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                        <p className="text-sm">{product.short_description}</p>
                      </Card>
                    )}

                    {/* Tags */}
                    <ProductTagsEditor productId={product.id} />

                    {/* Location Map */}
                    {(product as any).location && (
                      <LocationMapEmbed location={(product as any).location} />
                    )}

                    {/* Consumption Model */}
                    {(product.consumption_model || product.included_quantity || product.recommended_frequency || product.typical_duration_days) && (
                      <Card className="p-3">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Modelo de Consumo
                        </p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                          {product.consumption_model && (
                            <>
                              <p className="text-muted-foreground">Modelo</p>
                              <p>{consumptionModelLabels[product.consumption_model as keyof typeof consumptionModelLabels] || product.consumption_model}</p>
                            </>
                          )}
                          {product.included_quantity && (
                            <>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />Qtd. Incluída
                              </p>
                              <p>{product.included_quantity} {product.consumption_model === 'sessions' ? 'sessões' : 'unidades'}</p>
                            </>
                          )}
                          {product.recommended_frequency && (
                            <>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />Frequência
                              </p>
                              <p>{recommendedFrequencyLabels[product.recommended_frequency as keyof typeof recommendedFrequencyLabels] || product.recommended_frequency}</p>
                            </>
                          )}
                          {product.typical_duration_days && (
                            <>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />Duração
                              </p>
                              <p>{product.typical_duration_days} dias</p>
                            </>
                          )}
                          <p className="text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />Rastreável
                          </p>
                          <p>{product.is_trackable !== false ? 'Sim' : 'Não'}</p>
                        </div>
                      </Card>
                    )}

                    {/* Technical Specifications */}
                    {product.specifications && typeof product.specifications === 'object' && Object.keys(product.specifications).length > 0 && (
                      <Card className="p-3">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Especificações Técnicas
                        </p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                          {Object.entries(product.specifications as Record<string, string>).map(([key, value]) =>
                            value ? (
                              <div key={key} className="contents">
                                <p className="text-muted-foreground capitalize py-0.5 border-b border-dashed border-muted">
                                  {key.replace(/_/g, ' ')}
                                </p>
                                <p className="font-medium py-0.5 border-b border-dashed border-muted">{value}</p>
                              </div>
                            ) : null
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Demo Video */}
                    {product.demo_video_url && (
                      <Card className="p-3">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5" />
                          Vídeo Demonstração
                        </p>
                        <ProductVideoPreview
                          videoUrl={product.demo_video_url}
                          productName={product.name}
                        />
                      </Card>
                    )}
                  </TabsContent>

                  {isBundle && (
                    <TabsContent value="components" className="mt-4">
                      <BundleComponentsTab product={product} currency={product.currency} />
                    </TabsContent>
                  )}

                  {isSessions && (
                    <TabsContent value="sessions" className="mt-4">
                      <SessionsTab product={product} />
                    </TabsContent>
                  )}

                  <TabsContent value="financial" className="mt-4">
                    <ProductFinancialSection product={product} />
                  </TabsContent>

                  <TabsContent value="usage" className="mt-4">
                    <ProductUsageHistory productId={productId} currency={product.currency} />
                  </TabsContent>

                  <TabsContent value="images" className="mt-4">
                    <ProductImagesGallery product={product} />
                  </TabsContent>

                  <TabsContent value="progressions" className="mt-4">
                    <ProductProgressionsTab product={product} />
                  </TabsContent>

                  <TabsContent value="cycles" className="mt-4">
                    <ProductCyclesTabEnhanced product={product} />
                  </TabsContent>

                  <TabsContent value="sheet" className="mt-4">
                    <ProductSheetSettings product={product} />
                  </TabsContent>

                  <TabsContent value="relations" className="mt-4">
                    <ProductRelationsTab product={product} />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <ProductDocumentsTab product={product} />
                  </TabsContent>

                  <TabsContent value="specs" className="mt-4">
                    <ProductSpecsTab product={product} />
                  </TabsContent>

                  <TabsContent value="stock" className="mt-4">
                    <ProductStockTab product={product as any} />
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-4">
                    <ProductAnalyticsTab />
                  </TabsContent>

                  <TabsContent value="lifecycle" className="mt-4">
                    <ProductLifecycleTab product={product as any} />
                  </TabsContent>

                  <TabsContent value="deliverables" className="mt-4">
                    <ProductDeliverablesManager productId={product.id} />
                  </TabsContent>

                  <TabsContent value="price-history" className="mt-4">
                    <ProductPriceHistoryTab
                      productId={product.id}
                      currentPrice={product.base_price}
                      costPrice={product.direct_cost}
                      currency={product.currency}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </TooltipProvider>
        </DialogContent>
      </Dialog>

      <CreateProductDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar o produto "{product?.name}"?
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
    </>
  );
}
