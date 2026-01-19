import { useState } from "react";
import { Package, Plus, Calendar, TrendingUp, Minus, MoreHorizontal, Trash2, History, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { ConsumptionLogsPanel } from "@/components/consumption/ConsumptionLogsPanel";
import { useProducts } from "@/hooks/useProducts";
import { 
  useContactAcquiredProducts, 
  useCompanyAcquiredProducts,
  useCreateAcquiredProduct,
  useRegisterConsumption,
  useDeleteAcquiredProduct 
} from "@/hooks/useAcquiredProducts";
import { useContactInvoiceProducts, useCompanyInvoiceProducts, InvoiceProduct } from "@/hooks/useInvoiceProducts";
import {
  AcquiredProduct,
  ACQUIRED_PRODUCT_STATUS_LABELS,
  ACQUIRED_PRODUCT_STATUS_COLORS,
  getConsumptionPercentage,
  getRemainingQuantity,
  AcquiredProductStatus,
} from "@/types/acquiredProduct";
import { consumptionModelLabels } from "@/types/product";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface AcquiredProductsSectionProps {
  contactId?: string;
  companyId?: string;
}

export function AcquiredProductsSection({ contactId, companyId }: AcquiredProductsSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [purchasedQuantity, setPurchasedQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Use appropriate hook based on entity type
  const contactProducts = useContactAcquiredProducts(contactId);
  const companyProducts = useCompanyAcquiredProducts(companyId);
  
  // Also fetch products from invoices
  const contactInvoiceProducts = useContactInvoiceProducts(contactId);
  const companyInvoiceProducts = useCompanyInvoiceProducts(companyId);
  
  const catalogQuery = useProducts();
  const catalogProducts = catalogQuery.data || [];
  const catalogLoading = catalogQuery.isLoading;
  const createProduct = useCreateAcquiredProduct();
  const registerConsumption = useRegisterConsumption();
  const deleteProduct = useDeleteAcquiredProduct();

  const products = contactId ? contactProducts.products : companyProducts.products;
  const invoiceProducts = contactId ? (contactInvoiceProducts.data || []) : (companyInvoiceProducts.data || []);
  const isLoading = (contactId ? contactProducts.isLoading : companyProducts.isLoading) || 
                    (contactId ? contactInvoiceProducts.isLoading : companyInvoiceProducts.isLoading);

  // Filter to show only products not already acquired (from contact_products or invoices)
  const existingProductIds = new Set([
    ...products.map(p => p.product_id),
    ...invoiceProducts.filter(ip => ip.product_id).map(ip => ip.product_id)
  ]);
  const availableProducts = catalogProducts.filter(
    cp => !existingProductIds.has(cp.id)
  );

  const handleAddProduct = async () => {
    if (!selectedProductId) return;

    await createProduct.mutateAsync({
      contactId,
      companyId,
      productId: selectedProductId,
      purchasedQuantity: parseInt(purchasedQuantity) || 1,
      unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      acquisitionDate,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const resetForm = () => {
    setSelectedProductId("");
    setPurchasedQuantity("1");
    setUnitPrice("");
    setAcquisitionDate(new Date().toISOString().split('T')[0]);
    setExpiryDate("");
    setNotes("");
  };

  const handleRegisterConsumption = async (productId: string) => {
    await registerConsumption.mutateAsync({ productId, quantity: 1 });
  };

  const handleDelete = async (productId: string) => {
    await deleteProduct.mutateAsync(productId);
  };

  // Group products by status
  const activeProducts = products.filter(p => p.status === 'ativo' || p.status === 'em_consumo');
  const completedProducts = products.filter(p => p.status === 'concluido' || p.status === 'expirado');
  
  // Check if there's any content to show
  const hasContent = products.length > 0 || invoiceProducts.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Produtos / Serviços Ativos
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto/Serviço</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Produto/Serviço</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogLoading ? (
                      <div className="p-2 text-center text-muted-foreground">A carregar...</div>
                    ) : availableProducts.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        Todos os produtos já foram adicionados
                      </div>
                    ) : (
                      availableProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                          {product.base_price && ` - ${product.base_price}€`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={purchasedQuantity}
                    onChange={(e) => setPurchasedQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço unitário (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de aquisição</Label>
                  <Input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de expiração</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre esta aquisição..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddProduct} 
                  disabled={!selectedProductId || createProduct.isPending}
                >
                  {createProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum produto adquirido</p>
            <p className="text-sm">Adicione produtos ou serviços a este cliente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Products from invoices (sold products) */}
            {invoiceProducts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Via Fatura</p>
                {invoiceProducts.map(invProduct => (
                  <InvoiceProductRow key={invProduct.id} product={invProduct} />
                ))}
              </div>
            )}
            
            {/* Active products from contact_products */}
            {activeProducts.length > 0 && (
              <div className="space-y-3">
                {invoiceProducts.length > 0 && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Outros</p>
                )}
                {activeProducts.map(product => (
                  <ProductRow 
                    key={product.id} 
                    product={product}
                    contactId={contactId}
                    companyId={companyId}
                    onRegisterConsumption={handleRegisterConsumption}
                    onDelete={handleDelete}
                    isRegisteringConsumption={registerConsumption.isPending}
                  />
                ))}
              </div>
            )}

            {/* Completed/Expired products */}
            {completedProducts.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Histórico</p>
                <div className="space-y-2 opacity-60">
                  {completedProducts.map(product => (
                    <ProductRow 
                      key={product.id} 
                      product={product}
                      contactId={contactId}
                      companyId={companyId}
                      onRegisterConsumption={handleRegisterConsumption}
                      onDelete={handleDelete}
                      isRegisteringConsumption={registerConsumption.isPending}
                      isHistorical
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductRowProps {
  product: AcquiredProduct;
  contactId?: string;
  companyId?: string;
  onRegisterConsumption: (id: string) => void;
  onDelete: (id: string) => void;
  isRegisteringConsumption: boolean;
  isHistorical?: boolean;
}

function ProductRow({ 
  product, 
  contactId,
  companyId,
  onRegisterConsumption, 
  onDelete,
  isRegisteringConsumption,
  isHistorical 
}: ProductRowProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const consumptionPercentage = getConsumptionPercentage(product);
  const remaining = getRemainingQuantity(product);
  const status = (product.status || 'ativo') as AcquiredProductStatus;
  const isTrackable = product.product?.is_trackable !== false;
  const consumptionModel = product.product?.consumption_model;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">
            {product.product?.name || "Produto"}
          </span>
          <Badge 
            variant="secondary" 
            className={ACQUIRED_PRODUCT_STATUS_COLORS[status]}
          >
            {ACQUIRED_PRODUCT_STATUS_LABELS[status]}
          </Badge>
        </div>

        {/* Consumption info */}
        {isTrackable && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>
                {product.consumed_quantity || 0} / {product.purchased_quantity || product.quantity || 0}
                {consumptionModel && ` ${consumptionModelLabels[consumptionModel as keyof typeof consumptionModelLabels] || consumptionModel}`}
              </span>
              <span>{remaining} restantes</span>
            </div>
            <Progress value={consumptionPercentage} className="h-2" />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {product.acquisition_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(product.acquisition_date), "d MMM yyyy", { locale: pt })}
            </span>
          )}
          {product.total_value && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {product.total_value.toFixed(2)}€
            </span>
          )}
          {product.product?.category && (
            <Badge variant="outline" className="text-xs">
              {product.product.category}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isHistorical && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isTrackable && status !== 'concluido' && (
              <DropdownMenuItem 
                onClick={() => onRegisterConsumption(product.id)}
                disabled={isRegisteringConsumption}
              >
                <Minus className="h-4 w-4 mr-2" />
                Registar consumo (+1)
              </DropdownMenuItem>
            )}
            {isTrackable && (
              <DropdownMenuItem onClick={() => setIsHistoryOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Ver histórico
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover produto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover o produto "{product.product?.name}" deste cliente.
                    O histórico de consumo será perdido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(product.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Consumption History Sheet */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Histórico de Consumo</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ConsumptionLogsPanel 
              acquiredProduct={product}
              contactId={contactId}
              companyId={companyId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Component to display products from invoices
function InvoiceProductRow({ product }: { product: InvoiceProduct }) {
  const statusLabels: Record<string, string> = {
    sent: 'Enviado',
    paid: 'Pago',
    overdue: 'Vencido',
  };
  
  const statusColors: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">
            {product.product?.name || product.description || "Produto"}
          </span>
          <Badge 
            variant="secondary" 
            className={statusColors[product.invoice_status || ''] || 'bg-gray-100 text-gray-800'}
          >
            {statusLabels[product.invoice_status || ''] || 'Fatura'}
          </Badge>
        </div>

        {/* Quantity info */}
        <div className="text-sm text-muted-foreground">
          {product.quantity > 1 && <span>{product.quantity}x </span>}
          {product.unit_price > 0 && <span>{product.unit_price.toFixed(2)}€/un</span>}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {product.invoice_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(product.invoice_date), "d MMM yyyy", { locale: pt })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {product.total.toFixed(2)}€
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Fatura
          </span>
          {product.product?.category && (
            <Badge variant="outline" className="text-xs">
              {product.product.category}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}