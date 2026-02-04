import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { POSProductSelector } from "./POSProductSelector";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Save,
  Loader2,
  Check,
  Edit2,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProducts } from "@/hooks/useProducts";
import { useProposalItems, useUpdateProposalItems } from "@/hooks/useProposals";
import type { Product } from "@/types/product";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditableItem {
  id?: string;
  product_id?: string | null;
  product?: Product;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
  is_enabled?: boolean;
  cost_snapshot?: number | null;
  operational_cost_snapshot?: number | null;
  priceOverride?: number;
  discount?: number;
}

interface POSProposalItemsEditorProps {
  proposalId: string;
  onSaved?: () => void;
}

export function POSProposalItemsEditor({ proposalId, onSaved }: POSProposalItemsEditorProps) {
  const queryClient = useQueryClient();
  const { data: existingItems, isLoading: loadingItems, dataUpdatedAt } = useProposalItems(proposalId);
  const { data: products } = useProducts({ status: "active" });
  const updateItems = useUpdateProposalItems();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Drag-and-drop refs
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize items from existing data
  useEffect(() => {
    if (loadingItems) return;
    if (lastSyncedAt === dataUpdatedAt) return;
    if (hasChanges) return;

    if (existingItems !== undefined) {
      const mappedItems = existingItems.map((item, idx) => {
        // Find the product to attach
        const product = products?.find(p => p.id === item.product_id);
        return {
          id: item.id,
          product_id: item.product_id,
          product,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: item.position ?? idx,
          is_enabled: item.is_enabled ?? true,
          cost_snapshot: item.cost_snapshot ?? null,
          operational_cost_snapshot: item.operational_cost_snapshot ?? null,
        };
      });
      
      setItems(mappedItems);
      setLastSyncedAt(dataUpdatedAt);
    }
  }, [existingItems, loadingItems, dataUpdatedAt, lastSyncedAt, hasChanges, products]);

  const formatPrice = (price: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getSelectedProductIds = useCallback(() => {
    return items.filter(i => i.product_id).map(i => i.product_id!);
  }, [items]);

  const handleAddProduct = (product: Product) => {
    // Check if already in list
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      // Increase quantity
      setItems(prev => prev.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setItems(prev => [
        ...prev,
        {
          product_id: product.id,
          product,
          name: product.name,
          description: product.short_description,
          quantity: 1,
          unit_price: product.base_price ?? 0,
          position: prev.length,
          cost_snapshot: product.direct_cost ?? null,
          operational_cost_snapshot: product.operational_cost ?? null,
        },
      ]);
    }
    setHasChanges(true);
  };

  const handleRemoveProduct = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId).map((item, idx) => ({
      ...item,
      position: idx,
    })));
    setHasChanges(true);
  };

  const handleUpdateQuantityByProductId = (productId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveProduct(productId);
      return;
    }
    setItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ));
    setHasChanges(true);
  };

  // Quantities map for POSProductSelector
  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(item => {
      if (item.product_id) {
        map[item.product_id] = item.quantity;
      }
    });
    return map;
  }, [items]);

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      position: idx,
    })));
    setHasChanges(true);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(index);
      return;
    }
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
    setHasChanges(true);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, unit_price: price, priceOverride: price } : item
    ));
    setHasChanges(true);
  };

  const handleUpdateDiscount = (index: number, discount: number | undefined) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const originalPrice = item.product?.base_price ?? item.unit_price;
      const discountedPrice = discount 
        ? originalPrice * (1 - discount / 100)
        : originalPrice;
      return { 
        ...item, 
        discount, 
        unit_price: discountedPrice,
        priceOverride: discountedPrice,
      };
    }));
    setHasChanges(true);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItemRef.current = index;
  };

  const handleDragEnd = () => {
    if (
      dragItemRef.current !== null &&
      dragOverItemRef.current !== null &&
      dragItemRef.current !== dragOverItemRef.current
    ) {
      setItems(prev => {
        const newItems = [...prev];
        const [removed] = newItems.splice(dragItemRef.current!, 1);
        newItems.splice(dragOverItemRef.current!, 0, removed);
        return newItems.map((item, idx) => ({ ...item, position: idx }));
      });
      setHasChanges(true);
    }
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      await updateItems.mutateAsync({
        proposalId,
        items: items.filter(item => item.name.trim() !== "").map(item => ({
          id: item.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: item.position,
          is_enabled: item.is_enabled,
          cost_snapshot: item.cost_snapshot,
          operational_cost_snapshot: item.operational_cost_snapshot,
        })),
      });
      setHasChanges(false);
      
      await queryClient.refetchQueries({ 
        queryKey: ["proposal-items", proposalId] 
      });
      
      setLastSyncedAt(null);
      toast.success("Itens guardados com sucesso!");
      onSaved?.();
    } catch (error) {
      toast.error("Erro ao guardar itens");
    }
  };

  const calculateItemTotal = (item: EditableItem) => {
    return item.quantity * item.unit_price;
  };

  const calculateItemCost = (item: EditableItem) => {
    const cost = (item.cost_snapshot ?? 0) + (item.operational_cost_snapshot ?? 0);
    return cost * item.quantity;
  };

  const totals = items.reduce(
    (acc, item) => {
      const itemTotal = calculateItemTotal(item);
      const itemCost = calculateItemCost(item);
      return {
        subtotal: acc.subtotal + itemTotal,
        cost: acc.cost + itemCost,
      };
    },
    { subtotal: 0, cost: 0 }
  );

  const margin = totals.subtotal - totals.cost;
  const marginPct = totals.subtotal > 0 ? (margin / totals.subtotal) * 100 : 0;

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 h-full min-h-[400px] lg:min-h-[500px]">
      {/* Product Selector - On mobile: second, on desktop: left side */}
      <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col min-h-0 lg:h-full">
        <POSProductSelector
          selectedProductIds={getSelectedProductIds()}
          quantities={quantities}
          onAddProduct={handleAddProduct}
          onRemoveProduct={handleRemoveProduct}
          onUpdateQuantity={handleUpdateQuantityByProductId}
        />
      </div>

      {/* Cart / Items List - On mobile: first (top), on desktop: right side */}
      <div className="order-1 lg:order-2 lg:col-span-5 min-h-0">
        <Card className="p-4 h-full flex flex-col max-h-[40vh] lg:max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                Itens da Proposta ({items.length})
              </span>
            </div>
            {items.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setItems([]);
                  setHasChanges(true);
                }} 
                className="text-destructive hover:text-destructive"
              >
                Limpar
              </Button>
            )}
          </div>

          <Separator className="mb-3" />

          {/* Items List */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground/70">
                  Clique nos produtos para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const itemKey = item.id || `new-${index}`;
                  const isExpanded = expandedItems.has(itemKey);
                  const hasOverride = item.priceOverride !== undefined;
                  const itemTotal = calculateItemTotal(item);
                  const originalPrice = item.product?.base_price ?? item.unit_price;
                  const originalTotal = originalPrice * item.quantity;
                  const hasDiscount = item.discount && item.discount > 0;

                  return (
                    <Collapsible
                      key={itemKey}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(itemKey)}
                    >
                      <Card 
                        className={cn(
                          "p-3 bg-muted/30 transition-all duration-200",
                          draggedIndex === index && "opacity-50 scale-95"
                        )}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div className="flex items-start gap-2">
                          {/* Drag Handle */}
                          <div 
                            className="flex items-center text-muted-foreground cursor-grab active:cursor-grabbing pt-1 hover:text-primary transition-colors"
                            title="Arraste para reordenar"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {item.name}
                              </h4>
                              {(hasOverride || hasDiscount) && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  Editado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-20 h-6 text-sm text-primary font-semibold text-right px-1"
                                />
                                <span className="text-xs text-muted-foreground">€</span>
                              </div>
                              {item.quantity > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  (Total: {formatPrice(itemTotal)})
                                </span>
                              )}
                              {(hasOverride || hasDiscount) && originalTotal !== itemTotal && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(originalTotal)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <Edit2 className="h-3 w-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Preço unitário
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">
                                Desconto (%)
                              </label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={item.discount ?? ""}
                                onChange={(e) => handleUpdateDiscount(
                                  index,
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )}
                                className="h-8 text-sm"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          {hasOverride && item.product && item.unit_price !== item.product.base_price && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-6 text-xs"
                              onClick={() => handleUpdatePrice(index, item.product!.base_price ?? 0)}
                            >
                              Restaurar preço original
                            </Button>
                          )}
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Totals */}
          {items.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo estimado</span>
                <span className="text-muted-foreground">{formatPrice(totals.cost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Margem bruta</span>
                <div className="text-right">
                  <span className={cn(
                    "font-bold",
                    marginPct >= 40 ? "text-green-600 dark:text-green-400" :
                    marginPct >= 20 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {formatPrice(margin)}
                  </span>
                  <span className={cn(
                    "text-sm ml-1",
                    marginPct >= 40 ? "text-green-600/70 dark:text-green-400/70" :
                    marginPct >= 20 ? "text-yellow-600/70 dark:text-yellow-400/70" :
                    "text-red-600/70 dark:text-red-400/70"
                  )}>
                    ({marginPct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || updateItems.isPending}
                  className={cn(
                    "w-full",
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
                  {hasChanges ? "Guardar Alterações" : "Guardado"}
                </Button>
                {hasChanges && (
                  <p className="text-xs text-amber-600 text-center mt-2">
                    Alterações por guardar
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
