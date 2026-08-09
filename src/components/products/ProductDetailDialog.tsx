import { useEffect, useState } from "react";
import { SendProductByWhatsAppButton } from "@/components/whatsapp-pro/SendProductByWhatsAppButton";
import { WhatsAppProductSharesSection } from "@/components/whatsapp-pro/WhatsAppProductSharesSection";
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
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { LocationMapEmbed } from "./LocationMapEmbed";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProduct, useUpdateProduct, useArchiveProduct, useDeleteProduct, useDuplicateProduct } from "@/hooks/useProducts";
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
import { ProductVariantsTab } from "./ProductVariantsTab";
import { ProductAnalyticsTab } from "./ProductAnalyticsTab";
import { ProductLifecycleTab } from "./ProductLifecycleTab";
import { ProductSalesPlaybookTab } from "./ProductSalesPlaybookTab";
import { ProductBarcodeQRSection } from "./ProductBarcodeQRSection";
import { ProductTagsEditor } from "./ProductTagsEditor";
import { ProductOCRContentSection } from "./ProductOCRContentSection";
import { ProductPublicSheetTab } from "./ProductPublicSheetTab";
import { ProductPriceHistoryTab } from "./ProductPriceHistoryTab";
import { ProductActivityLog } from "./ProductActivityLog";
import { ProductPublishingPanel } from "./ProductPublishingPanel";
import { useProductImages } from "@/hooks/useProductImages";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MarginProtectionCard } from "./pricing/MarginProtectionCard";
import { MarketResearchPanel } from "./pricing/MarketResearchPanel";
import { ProductWeightAIPanel } from "./ProductWeightAIPanel";
import { Search as SearchIcon } from "lucide-react";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";

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
  const { data: productImages, isLoading: imagesLoading, isFetching: imagesFetching } = useProductImages(productId);
  const { data: storeSettings } = useStoreSettings();
  const { currentWorkspace } = useWorkspace();
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();
  const duplicateProduct = useDuplicateProduct();
  const deleteProduct = useDeleteProduct();
  const { canSeeField } = useFieldPermissions();
  const { salesFunction } = useAdaptiveDashboard();
  // Apenas Diretor e CEO têm acesso a custo e margem do produto
  const isLeadership = salesFunction === "diretor" || salesFunction === "ceo";
  const showCost = isLeadership && canSeeField("products", "direct_cost");
  const showMargin = isLeadership && canSeeField("products", "gross_margin");

  const [heroIdx, setHeroIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // Reset URLs falhadas ao trocar de produto
  useEffect(() => {
    setFailedUrls(new Set());
  }, [productId]);

  // Fallback: if product_images table is empty, use product.images array
  const fallbackImages: Array<{ id: string; url: string; alt_text: string | null }> =
    (!productImages || productImages.length === 0) && product?.images && Array.isArray(product.images)
      ? (product.images as string[]).map((url, i) => ({ id: `fallback-${i}`, url, alt_text: null }))
      : [];
  const allImages = (productImages && productImages.length > 0) ? productImages : fallbackImages;
  // Excluir imagens cujo URL falhou ao carregar (404/403)
  const displayImages = allImages.filter((img) => !failedUrls.has(img.url));
  const mainImage = displayImages[heroIdx];
  // Só renderizamos área de imagens quando produto carregou E a query de product_images resolveu
  // (evita flash de placeholder enquanto a relação ainda está em fetch).
  const imagesReady = !!product && !imagesLoading && (!imagesFetching || (productImages !== undefined));

  useEffect(() => {
    if (displayImages.length === 0) {
      if (heroIdx !== 0) setHeroIdx(0);
      return;
    }
    if (heroIdx >= displayImages.length || heroIdx < 0) {
      setHeroIdx(0);
    }
  }, [displayImages.length, heroIdx]);

  useEffect(() => {
    setHeroIdx(0);
  }, [productId]);

  const handleImageError = (url: string) => {
    console.warn('[PRODUCTS] IMAGE_LOAD_FAILED', url);
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    // Avançar para a próxima válida (heroIdx mantém-se; o filtro recalcula)
    setHeroIdx(0);
  };

  const hasMultipleImages = displayImages.length > 1;
  const canGoPrev = hasMultipleImages && heroIdx > 0;
  const canGoNext = hasMultipleImages && heroIdx < displayImages.length - 1;
  const goPrev = () => {
    if (canGoPrev) setHeroIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    if (canGoNext) setHeroIdx((i) => Math.min(displayImages.length - 1, i + 1));
  };

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  // Convenção do projeto: `base_price` e `direct_cost` são SEMPRE valores líquidos (sem IVA).
  // O IVA só é aplicado na apresentação ao cliente (loja, fatura), nunca aqui.
  const netBasePrice = product?.base_price ?? 0;
  const netDirectCost = product?.direct_cost ?? null;

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
        <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <TooltipProvider delayDuration={200}>
            {/* ═══ HERO HEADER — compacto ═══ */}
            <div className="relative bg-card border-b border-border">
              <div className="flex flex-col sm:flex-row gap-0">
                {/* Image area — reduzido para 180px */}
                <div className="relative w-full sm:w-[240px] h-[180px] sm:h-[180px] shrink-0 bg-muted/60 overflow-hidden">
                  {!imagesReady ? (
                    <div
                      className="w-full h-full flex items-center justify-center bg-muted/40 animate-pulse"
                      role="status"
                      aria-label="A carregar imagens do produto"
                    >
                      <Loader2 className="h-6 w-6 text-muted-foreground/50 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {mainImage ? (
                        <img
                          key={mainImage.url}
                          src={mainImage.url}
                          alt={mainImage.alt_text || product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => handleImageError(mainImage.url)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-14 w-14 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Prev / Next navigation */}
                      {hasMultipleImages && (
                        <>
                          <button
                            type="button"
                            onClick={goPrev}
                            disabled={!canGoPrev}
                            aria-label="Imagem anterior"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={goNext}
                            disabled={!canGoNext}
                            aria-label="Próxima imagem"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hover:bg-background border shadow flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {/* Mini gallery thumbnails */}
                      {hasMultipleImages && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1 overflow-x-auto">
                          {displayImages.slice(0, 5).map((img, idx) => (
                            <button
                              key={img.id}
                              onClick={() => setHeroIdx(idx)}
                              className={`w-8 h-8 rounded overflow-hidden border-2 shrink-0 transition-all ${
                                idx === heroIdx ? "border-primary shadow-md" : "border-white/50 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={img.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={() => handleImageError(img.url)}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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
                    <div className="mt-2">
                      <SendProductByWhatsAppButton
                        productId={product.id}
                        productName={product.name}
                        productPrice={product.base_price}
                        productImageUrl={mainImage?.url ?? null}
                        productLink={currentWorkspace?.slug ? `/store/${currentWorkspace.slug}/product/${product.id}` : null}
                      />
                    </div>

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
                        {formatCurrency(netBasePrice, product.currency)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">s/IVA</span>
                      {showMargin && netDirectCost !== null && netBasePrice > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Margem {((netBasePrice - netDirectCost) / netBasePrice * 100).toFixed(0)}%
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
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={duplicateProduct.isPending}
                          onClick={() => duplicateProduct.mutate(product.id)}
                        >
                          {duplicateProduct.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicar</TooltipContent>
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

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
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

                {(() => {
                  // Mapeamento tab → grupo (1 linha de 8 grupos com sub-tabs)
                  const tabToGroup: Record<string, string> = {
                    details: "general", components: "general", sessions: "general",
                    sheet: "content", images: "content", specs: "content",
                    "ai-content": "content", progressions: "content", "public-sheet": "content",
                    financial: "pricing", "price-history": "pricing", cycles: "pricing",
                    stock: "stock", variants: "stock",
                    analytics: "sales", usage: "sales", lifecycle: "sales", playbook: "sales",
                    publishing: "publishing", deliverables: "publishing",
                    relations: "relations", documents: "relations",
                    audit: "audit",
                  };
                  const group = tabToGroup[tab] ?? "general";
                  const groupDefault: Record<string, string> = {
                    general: "details", content: "sheet", pricing: "financial",
                    stock: "stock", sales: "analytics", publishing: "publishing",
                    relations: "relations", audit: "audit",
                  };
                  const groups: Array<{ value: string; label: string; icon: typeof Info }> = [
                    { value: "general", label: "Geral", icon: Info },
                    { value: "content", label: "Conteúdo", icon: FileText },
                    { value: "pricing", label: "Preços", icon: DollarSign },
                    { value: "stock", label: "Stock", icon: Package },
                    { value: "sales", label: "Vendas", icon: TrendingUp },
                    { value: "publishing", label: "Publicação", icon: Send },
                    { value: "relations", label: "Relações", icon: Link2 },
                    { value: "audit", label: "Auditoria", icon: History },
                  ];
                  const subTabs: Record<string, Array<{ value: string; label: string; show?: boolean }>> = {
                    general: [
                      { value: "details", label: "Detalhes" },
                      ...(isBundle ? [{ value: "components", label: "Componentes" }] : []),
                      ...(isSessions ? [{ value: "sessions", label: "Pacotes" }] : []),
                    ],
                    content: [
                      { value: "sheet", label: "Ficha" },
                      { value: "public-sheet", label: "Ficha pública" },
                      { value: "images", label: "Imagens" },
                      { value: "specs", label: "Specs" },
                      { value: "ai-content", label: "Conteúdo IA" },
                      { value: "progressions", label: "Progressões" },
                    ],
                    pricing: [
                      { value: "financial", label: "Financeiro" },
                      ...(showCost ? [{ value: "price-history", label: "Histórico de preços" }] : []),
                      { value: "cycles", label: "Ciclos" },
                    ],
                    sales: [
                      { value: "analytics", label: "Analytics" },
                      { value: "usage", label: "Histórico" },
                      { value: "lifecycle", label: "Ciclo de vida" },
                      { value: "playbook", label: "Vendas & Pós-venda" },
                    ],
                    publishing: [
                      { value: "publishing", label: "Publicação" },
                      { value: "deliverables", label: "Entregáveis" },
                    ],
                    relations: [
                      { value: "relations", label: "Relações" },
                      { value: "documents", label: "Documentos" },
                    ],
                    stock: [
                      { value: "stock", label: "Stock" },
                      { value: "variants", label: "Variantes" },
                    ],
                  };
                  const currentSubs = subTabs[group];
                  return (
                    <Tabs value={tab} onValueChange={setTab}>
                      <div className="space-y-3">
                        <div className="border-b border-border">
                          <div className="flex flex-wrap items-center gap-1 -mb-px">
                            {groups.map((g) => {
                              const active = group === g.value;
                              return (
                                <button
                                  key={g.value}
                                  type="button"
                                  onClick={() => setTab(groupDefault[g.value])}
                                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    active
                                      ? "border-primary text-foreground"
                                      : "border-transparent text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {g.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {currentSubs && currentSubs.length > 1 && (
                          <div className="flex flex-wrap gap-1.5">
                            {currentSubs.map((s) => {
                              const active = tab === s.value;
                              return (
                                <button
                                  key={s.value}
                                  type="button"
                                  onClick={() => setTab(s.value)}
                                  className={`text-xs px-3 h-7 rounded-full border transition-colors ${
                                    active
                                      ? "border-primary text-primary bg-primary/5 font-medium"
                                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                  }`}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                  {/* ═══ TAB CONTENTS ═══ */}
                  <TabsContent value="details" className="mt-4 space-y-4">
                    {/* Price/Cost cards side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">
                          {isBundle ? "Preço do Bundle" : "Preço Base"} <span className="text-[10px] uppercase">(s/IVA)</span>
                        </p>
                        <p className="text-xl font-bold mt-0.5">
                          {formatCurrency(netBasePrice, product.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {billingTypeLabels[product.billing_type]}
                          {isBundle && product.bundle_price_mode && (
                            <> • {product.bundle_price_mode === "auto" ? "Automático" : "Manual"}</>
                          )}
                        </p>
                      </Card>

                      {showCost && (
                        <Card className="p-3">
                          <p className="text-xs text-muted-foreground">
                            {isBundle ? "Custo Total" : "Custo Direto"} <span className="text-[10px] uppercase">(s/IVA)</span>
                          </p>
                          {netDirectCost !== null ? (
                            <>
                              <p className="text-xl font-semibold mt-0.5">
                                {formatCurrency(netDirectCost, product.currency)}
                              </p>
                              {showMargin && netBasePrice > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Margem: {((netBasePrice - netDirectCost) / netBasePrice * 100).toFixed(1)}%
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-2">Não definido</p>
                          )}
                        </Card>
                      )}
                    </div>

                    {/* Margin Protection & Market Research */}
                    {showMargin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <MarginProtectionCard
                        price={product.base_price}
                        cost={product.direct_cost}
                        category={product.category}
                      />
                      <MarketResearchPanel
                        productId={product.id}
                        workspaceId={currentWorkspace?.id || ""}
                        productName={product.name}
                        sku={product.sku || undefined}
                        category={product.category || undefined}
                        barcode={(product as any).barcode || undefined}
                        currentPrice={product.base_price}
                        costPrice={product.direct_cost || undefined}
                      />
                    </div>
                    )}

                    {/* Weight AI Panel */}
                    <ProductWeightAIPanel
                      productId={product.id}
                      productName={product.name}
                      sku={product.sku}
                      category={product.category}
                      description={(product as any).description}
                      currentWeight={(product as any).weight}
                    />

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

                    {(product.short_description || (product as any).commercial_description) && (
                      <Card className="p-3 space-y-2">
                        {product.short_description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Descrição Curta</p>
                            <p className="text-sm whitespace-pre-wrap">{product.short_description}</p>
                          </div>
                        )}
                        {(product as any).commercial_description && (product as any).commercial_description !== product.short_description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Descrição Comercial</p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{(product as any).commercial_description}</p>
                          </div>
                        )}
                      </Card>
                    )}

                    {/* Conteúdo OCR/IA: textos longos, scripts, argumentário */}
                    <ProductOCRContentSection productId={product.id} />

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

                  <TabsContent value="usage" className="mt-4 space-y-4">
                    <ProductUsageHistory productId={productId} currency={product.currency} />
                    <WhatsAppProductSharesSection productId={product.id} />
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

                  <TabsContent value="publishing" className="mt-4">
                    <ProductPublishingPanel productId={product.id} />
                  </TabsContent>

                  <TabsContent value="relations" className="mt-4">
                    <ProductRelationsTab product={product} />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <ProductDocumentsTab product={product} />
                  </TabsContent>

                  <TabsContent value="ai-content" className="mt-4">
                    <ProductOCRContentSection productId={product.id} showEmpty />
                  </TabsContent>

                  <TabsContent value="specs" className="mt-4">
                    <ProductSpecsTab product={product} />
                  </TabsContent>

                  <TabsContent value="stock" className="mt-4">
                    <ProductStockTab product={product as any} />
                  </TabsContent>

                  <TabsContent value="variants" className="mt-4">
                    <ProductVariantsTab
                      productId={product.id}
                      workspaceId={product.workspace_id}
                      basePrice={product.base_price}
                      currency={product.currency}
                    />
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-4">
                    <ProductAnalyticsTab />
                  </TabsContent>

                  <TabsContent value="lifecycle" className="mt-4">
                    <ProductLifecycleTab product={product as any} />
                  </TabsContent>

                  <TabsContent value="playbook" className="mt-4">
                    <ProductSalesPlaybookTab product={product as any} />
                  </TabsContent>

                  <TabsContent value="deliverables" className="mt-4">
                    <ProductDeliverablesManager productId={product.id} />
                  </TabsContent>

                  {showCost && (
                    <TabsContent value="price-history" className="mt-4">
                      <ProductPriceHistoryTab
                        productId={product.id}
                        currentPrice={product.base_price}
                        costPrice={product.direct_cost}
                        currency={product.currency}
                      />
                    </TabsContent>
                  )}

                  <TabsContent value="audit" className="mt-4">
                    <ProductActivityLog productId={product.id} />
                  </TabsContent>
                    </Tabs>
                  );
                })()}
              </div>
            </div>
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
