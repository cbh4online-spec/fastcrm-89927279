import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import type { Product, ProductType, BillingType } from "@/types/product";

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  product,
}: CreateProductDialogProps) {
  const [name, setName] = useState("");
  const [productType, setProductType] = useState<ProductType>("simple");
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [billingType, setBillingType] = useState<BillingType>("one-off");
  const [shortDescription, setShortDescription] = useState("");
  const [sku, setSku] = useState("");
  const [directCost, setDirectCost] = useState("");
  const [commissionDefault, setCommissionDefault] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEditing = !!product;
  const isLoading = createProduct.isPending || updateProduct.isPending;

  useEffect(() => {
    if (product) {
      setName(product.name);
      setProductType(product.product_type);
      setCategory(product.category || "");
      setBasePrice(product.base_price.toString());
      setCurrency(product.currency);
      setBillingType(product.billing_type);
      setShortDescription(product.short_description || "");
      setSku(product.sku || "");
      setDirectCost(product.direct_cost?.toString() || "");
      setCommissionDefault(product.commission_default?.toString() || "");
      setShowAdvanced(!!product.direct_cost || !!product.commission_default);
    } else {
      resetForm();
    }
  }, [product, open]);

  const resetForm = () => {
    setName("");
    setProductType("simple");
    setCategory("");
    setBasePrice("");
    setCurrency("EUR");
    setBillingType("one-off");
    setShortDescription("");
    setSku("");
    setDirectCost("");
    setCommissionDefault("");
    setShowAdvanced(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      product_type: productType,
      category: category || undefined,
      base_price: parseFloat(basePrice) || 0,
      currency,
      billing_type: billingType,
      short_description: shortDescription || undefined,
      sku: sku || undefined,
      direct_cost: directCost ? parseFloat(directCost) : undefined,
      commission_default: commissionDefault ? parseFloat(commissionDefault) : undefined,
    };

    if (isEditing) {
      await updateProduct.mutateAsync({ id: product.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isValid = name.trim() && parseFloat(basePrice) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? "Editar Produto" : "Criar Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do produto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simples</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cobrança</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-off">Único</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Preço Base *</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ex: Formação, Consultoria, Software"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição curta</Label>
            <Textarea
              id="description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Breve descrição do produto"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">Código interno (SKU)</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-muted-foreground">Campos avançados</span>
                {showAdvanced ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Opcional — ajuda nas margens e comissões.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="directCost">Custo direto</Label>
                  <Input
                    id="directCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={directCost}
                    onChange={(e) => setDirectCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Comissão padrão (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionDefault}
                    onChange={(e) => setCommissionDefault(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
