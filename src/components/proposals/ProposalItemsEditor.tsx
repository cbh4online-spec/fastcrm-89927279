import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Package,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useProposalItems, useUpdateProposalItems } from "@/hooks/useProposals";
import type { Product } from "@/types/product";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditableItem {
  id?: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
}

interface ProposalItemsEditorProps {
  proposalId: string;
  onSaved?: () => void;
}

export function ProposalItemsEditor({ proposalId, onSaved }: ProposalItemsEditorProps) {
  const { data: existingItems, isLoading: loadingItems } = useProposalItems(proposalId);
  const { data: products } = useProducts({ status: "active" });
  const updateItems = useUpdateProposalItems();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize items from existing data
  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map((item, idx) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        position: item.position ?? idx,
      })));
    }
  }, [existingItems]);

  const formatPrice = (price: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        quantity: 1,
        unit_price: 0,
        position: prev.length,
      },
    ]);
    setHasChanges(true);
  };

  const handleAddProduct = (product: Product) => {
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        description: product.short_description,
        quantity: 1,
        unit_price: product.base_price ?? 0,
        position: prev.length,
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      position: idx,
    })));
    setHasChanges(true);
  };

  const handleUpdateItem = (index: number, field: keyof EditableItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateItems.mutateAsync({
        proposalId,
        items: items.filter((item) => item.name.trim() !== ""),
      });
      setHasChanges(false);
      toast.success("Itens guardados com sucesso!");
      onSaved?.();
    } catch (error) {
      toast.error("Erro ao guardar itens");
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Product Quick Select */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar Produto</span>
          <Select
            value=""
            onValueChange={(productId) => {
              const product = products?.find((p) => p.id === productId);
              if (product) handleAddProduct(product);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar produto do catálogo..." />
            </SelectTrigger>
            <SelectContent>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{product.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {formatPrice(product.base_price ?? 0)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            Item Manual
          </Button>
        </div>
      </Card>

      {/* Items List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum item na proposta</p>
              <p className="text-sm">Adicione produtos ou itens manuais acima</p>
            </div>
          ) : (
            items.map((item, index) => (
              <Card key={item.id || index} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center text-muted-foreground cursor-move pt-2">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* First row: Name, Qty, Price, Total, Delete */}
                    <div className="grid grid-cols-12 gap-3">
                      {/* Name */}
                      <div className="col-span-5 space-y-1">
                        <label className="text-xs text-muted-foreground">Nome</label>
                        <Input
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                          placeholder="Nome do item"
                          className="h-8"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">Qtd.</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          className="h-8"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">Preço Unit.</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>

                      {/* Total */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">Total</label>
                        <div className="h-8 flex items-center font-semibold text-sm text-primary">
                          {formatPrice(item.quantity * item.unit_price)}
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 flex items-end justify-end pb-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Second row: Description */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
                      <Input
                        value={item.description || ""}
                        onChange={(e) => handleUpdateItem(index, "description", e.target.value)}
                        placeholder="Descrição adicional do item..."
                        className="h-8"
                      />
                    </div>
                    
                    {/* Product badge */}
                    {item.product_id && (
                      <span className="inline-flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        <Package className="h-3 w-3 mr-1" />
                        Produto do catálogo
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Total and Save */}
      <Separator />
      <div className="flex items-center justify-between pt-2">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Total da Proposta</p>
          <p className="text-2xl font-bold text-primary">{formatPrice(calculateTotal())}</p>
          <p className="text-xs text-muted-foreground">{items.length} item(ns)</p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Alterações por guardar
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateItems.isPending}
            className={cn(
              "min-w-[140px]",
              hasChanges ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"
            )}
          >
            {updateItems.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : hasChanges ? (
              <Save className="h-4 w-4 mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {hasChanges ? "Guardar Itens" : "Guardado"}
          </Button>
        </div>
      </div>
    </div>
  );
}
