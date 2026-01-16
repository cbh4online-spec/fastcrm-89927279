import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Trash2, Calendar, Euro, GraduationCap } from "lucide-react";
import { useContactProducts } from "../useContactData";
import { useProducts } from "@/hooks/useProducts";
import { ContactProduct } from "../ENIContactTypes";
import { cn } from "@/lib/utils";

interface ProductsSectionProps {
  contactId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" },
  concluido: { label: "Concluído", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30" },
  expirado: { label: "Expirado", color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30" },
};

export function ProductsSection({ contactId }: ProductsSectionProps) {
  const { products, isLoading, addProduct, updateProductStatus, removeProduct } = useContactProducts(contactId);
  const productsQuery = useProducts();
  const availableProducts = productsQuery.data || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleAddProduct = async () => {
    if (!selectedProductId) return;

    await addProduct.mutateAsync({
      productId: selectedProductId,
      quantity: parseInt(quantity) || 1,
      unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      acquisitionDate: acquisitionDate || undefined,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    });

    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setSelectedProductId("");
    setQuantity("1");
    setUnitPrice("");
    setAcquisitionDate("");
    setExpiryDate("");
    setNotes("");
  };

  const handleStatusChange = async (productId: string, status: string) => {
    await updateProductStatus.mutateAsync({ id: productId, status });
  };

  const handleRemove = async (productId: string) => {
    await removeProduct.mutateAsync(productId);
  };

  // Filter out already added products
  const addedProductIds = products.map(p => p.product_id);
  const filteredProducts = availableProducts.filter(p => !addedProductIds.includes(p.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Produtos / Formações
            </CardTitle>
            <CardDescription>Produtos e formações adquiridas pelo cliente.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={filteredProducts.length === 0}>
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Produto/Formação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.base_price && `(€${product.base_price})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Unitário (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Aquisição</Label>
                    <Input
                      type="date"
                      value={acquisitionDate}
                      onChange={(e) => setAcquisitionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Expiração</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddProduct}
                  disabled={!selectedProductId || addProduct.isPending}
                >
                  {addProduct.isPending ? "A adicionar..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || productsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem produtos</p>
            <p className="text-xs">Adicione produtos ou formações adquiridas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                onStatusChange={handleStatusChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductRow({ 
  product, 
  onStatusChange,
  onRemove,
}: { 
  product: ContactProduct; 
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
}) {
  const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.ativo;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {product.product?.name || "Produto"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.total_value && (
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {product.total_value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </span>
            )}
            {product.acquisition_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(product.acquisition_date).toLocaleDateString("pt-PT")}
              </span>
            )}
            <Badge className={cn("text-xs", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Select 
          value={product.status} 
          onValueChange={(v) => onStatusChange(product.id, v)}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Produto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que deseja remover este produto do cliente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onRemove(product.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
