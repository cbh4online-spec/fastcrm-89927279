import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, GripVertical, Package, Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import {
  useProductComponents,
  useAddProductComponent,
  useUpdateProductComponent,
  useRemoveProductComponent,
  calculateBundleTotals,
} from "@/hooks/useProductComponents";
import type { Product } from "@/types/product";

interface BundleComponentsTabProps {
  product: Product;
  currency: string;
}

export function BundleComponentsTab({ product, currency }: BundleComponentsTabProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");

  const { data: components, isLoading } = useProductComponents(product.id);
  const { data: allProducts } = useProducts({ status: "active" });
  const addComponent = useAddProductComponent();
  const updateComponent = useUpdateProductComponent();
  const removeComponent = useRemoveProductComponent();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  // Filter out the parent product and already added components
  const availableProducts = allProducts?.filter(
    (p) =>
      p.id !== product.id &&
      !components?.some((c) => c.component_product_id === p.id)
  );

  const handleAddComponent = async () => {
    if (!selectedProductId) return;
    await addComponent.mutateAsync({
      parentProductId: product.id,
      componentProductId: selectedProductId,
      quantity: parseInt(quantity) || 1,
    });
    setSelectedProductId("");
    setQuantity("1");
  };

  const handleRemove = async (id: string) => {
    await removeComponent.mutateAsync({ id, parentProductId: product.id });
  };

  const handleToggleOptional = async (id: string, currentValue: boolean) => {
    await updateComponent.mutateAsync({
      id,
      parentProductId: product.id,
      isOptional: !currentValue,
    });
  };

  const totals = components
    ? calculateBundleTotals(components, product.bundle_price_mode || "auto", product.base_price)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add component */}
      <Card className="p-4">
        <p className="text-sm font-medium mb-3">Adicionar Componente</p>
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar produto..." />
            </SelectTrigger>
            <SelectContent>
              {availableProducts?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} - {formatCurrency(p.base_price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20"
            placeholder="Qtd"
          />
          <Button
            onClick={handleAddComponent}
            disabled={!selectedProductId || addComponent.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </Card>

      {/* Components list */}
      {components && components.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Preço Unit.</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Opcional</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp) => {
                const price = comp.price_override ?? (comp.component?.base_price || 0);
                const cost = comp.cost_override ?? (comp.component?.direct_cost || 0);
                return (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {comp.component?.name || "—"}
                    </TableCell>
                    <TableCell>{comp.quantity}</TableCell>
                    <TableCell>{formatCurrency(price)}</TableCell>
                    <TableCell>{formatCurrency(cost)}</TableCell>
                    <TableCell>{formatCurrency(price * comp.quantity)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={comp.is_optional ? "secondary" : "default"}
                        className="cursor-pointer"
                        onClick={() => handleToggleOptional(comp.id, comp.is_optional)}
                      >
                        {comp.is_optional ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(comp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Totals */}
          {totals && (
            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Preço Componentes</p>
                  <p className="font-semibold">{formatCurrency(totals.componentsPrice)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo Total</p>
                  <p className="font-semibold">{formatCurrency(totals.totalCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço Final Bundle</p>
                  <p className="font-semibold text-lg">{formatCurrency(totals.finalPrice)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margem</p>
                  <p className={`font-semibold ${totals.grossMarginPct >= 30 ? "text-green-600" : totals.grossMarginPct >= 15 ? "text-yellow-600" : "text-destructive"}`}>
                    {formatCurrency(totals.grossMargin)} ({totals.grossMarginPct.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Nenhum componente adicionado.</p>
          <p className="text-sm">Adicione produtos para compor este bundle.</p>
        </div>
      )}
    </div>
  );
}
