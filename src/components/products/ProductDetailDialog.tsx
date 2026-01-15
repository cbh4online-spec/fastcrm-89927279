import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  Edit,
  Archive,
  RotateCcw,
  Loader2,
  ImagePlus,
  Trash2,
  DollarSign,
  History,
  Layers,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProduct, useUpdateProduct, useArchiveProduct } from "@/hooks/useProducts";
import { useProductStats, generateProductAlerts } from "@/hooks/useProductStats";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
} from "@/types/product";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductFinancialSection } from "./ProductFinancialSection";
import { ProductKPICards } from "./ProductKPICards";
import { ProductUsageHistory } from "./ProductUsageHistory";
import { ProductAlerts } from "./ProductAlerts";
import { BundleComponentsTab } from "./BundleComponentsTab";

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
  const [newImageUrl, setNewImageUrl] = useState("");

  const { data: product, isLoading } = useProduct(productId);
  const { data: stats } = useProductStats(productId);
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();

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

  const handleAddImage = async () => {
    if (!product || !newImageUrl.trim()) return;

    await updateProduct.mutateAsync({
      id: product.id,
      images: [...(product.images || []), newImageUrl.trim()],
    });
    setNewImageUrl("");
  };

  const handleRemoveImage = async (index: number) => {
    if (!product) return;

    const newImages = [...(product.images || [])];
    newImages.splice(index, 1);

    await updateProduct.mutateAsync({
      id: product.id,
      images: newImages,
    });
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
  const alerts = generateProductAlerts(product, stats);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBundle ? (
                  <Layers className="h-6 w-6 text-primary" />
                ) : (
                  <Package className="h-6 w-6" />
                )}
                <div>
                  <DialogTitle className="text-xl">{product.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isBundle ? "default" : "outline"}>
                      {productTypeLabels[product.product_type]}
                    </Badge>
                    <Badge
                      variant={product.status === "active" ? "default" : "secondary"}
                    >
                      {productStatusLabels[product.status]}
                    </Badge>
                    {product.category && (
                      <Badge variant="secondary">{product.category}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                >
                  {product.status === "active" ? (
                    <>
                      <Archive className="h-4 w-4 mr-1" />
                      Arquivar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reativar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            {/* Bundle warning about historical data */}
            {isBundle && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Alterações neste bundle não afetam vendas passadas. Os snapshots históricos são imutáveis.
                </AlertDescription>
              </Alert>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="mb-4">
                <ProductAlerts alerts={alerts} />
              </div>
            )}

            {/* KPI Cards */}
            <div className="mb-6">
              <ProductKPICards productId={productId} currency={product.currency} />
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                {isBundle && (
                  <TabsTrigger value="components">
                    <Layers className="h-4 w-4 mr-1" />
                    Componentes
                  </TabsTrigger>
                )}
                <TabsTrigger value="financial">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="usage">
                  <History className="h-4 w-4 mr-1" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="images">Imagens</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">
                      {isBundle ? "Preço do Bundle" : "Preço Base"}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(product.base_price, product.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {billingTypeLabels[product.billing_type]}
                      {isBundle && product.bundle_price_mode && (
                        <> • Modo: {product.bundle_price_mode === "auto" ? "Automático" : "Manual"}</>
                      )}
                    </p>
                  </Card>

                  {product.direct_cost !== null && (
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {isBundle ? "Custo Total" : "Custo Direto"}
                      </p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(product.direct_cost, product.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Margem:{" "}
                        {(
                          ((product.base_price - product.direct_cost) /
                            product.base_price) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </Card>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {product.sku && (
                    <>
                      <p className="text-muted-foreground">SKU</p>
                      <p className="font-mono">{product.sku}</p>
                    </>
                  )}

                  {product.commission_default !== null && (
                    <>
                      <p className="text-muted-foreground">Comissão Padrão</p>
                      <p>{product.commission_default}%</p>
                    </>
                  )}

                  <p className="text-muted-foreground">Criado em</p>
                  <p>
                    {format(new Date(product.created_at), "dd/MM/yyyy HH:mm", {
                      locale: pt,
                    })}
                  </p>

                  <p className="text-muted-foreground">Última atualização</p>
                  <p>
                    {format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", {
                      locale: pt,
                    })}
                  </p>
                </div>

                {product.short_description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                      <p className="text-sm">{product.short_description}</p>
                    </div>
                  </>
                )}
              </TabsContent>

              {isBundle && (
                <TabsContent value="components" className="mt-4">
                  <BundleComponentsTab product={product} currency={product.currency} />
                </TabsContent>
              )}

              <TabsContent value="financial" className="mt-4">
                <ProductFinancialSection product={product} />
              </TabsContent>

              <TabsContent value="usage" className="mt-4">
                <ProductUsageHistory productId={productId} currency={product.currency} />
              </TabsContent>

              <TabsContent value="images" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="URL da imagem"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleAddImage}
                    disabled={!newImageUrl.trim() || updateProduct.isPending}
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {product.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImagePlus className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Sem imagens ainda.</p>
                    <p className="text-sm">Adicione URLs de imagens acima.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CreateProductDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />
    </>
  );
}
