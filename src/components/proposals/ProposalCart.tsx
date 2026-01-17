import { useState } from "react";
import { Trash2, Plus, Minus, ShoppingCart, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

export interface CartItem {
  product: Product;
  quantity: number;
  priceOverride?: number;
  discount?: number;
}

interface ProposalCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number | undefined) => void;
  onUpdateDiscount: (productId: string, discount: number | undefined) => void;
  onRemoveItem: (productId: string) => void;
  onClear: () => void;
}

export function ProposalCart({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onRemoveItem,
  onClear,
}: ProposalCartProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingPrice, setEditingPrice] = useState<string | null>(null);

  const toggleExpanded = (productId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const formatPrice = (price: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const calculateItemTotal = (item: CartItem) => {
    const basePrice = item.priceOverride ?? item.product.base_price ?? 0;
    const discountAmount = item.discount ? basePrice * (item.discount / 100) : 0;
    return (basePrice - discountAmount) * item.quantity;
  };

  const calculateItemCost = (item: CartItem) => {
    const cost = (item.product.direct_cost ?? 0) + (item.product.operational_cost ?? 0);
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

  if (items.length === 0) {
    return (
      <Card className="p-4 h-full flex flex-col items-center justify-center text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-muted-foreground">Carrinho vazio</p>
        <p className="text-sm text-muted-foreground/70">
          Clique nos produtos para adicionar
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            Itens da Proposta ({items.length})
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive">
          Limpar
        </Button>
      </div>

      <Separator className="mb-3" />

      {/* Items List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedItems.has(item.product.id);
            const hasOverride = item.priceOverride !== undefined;
            const itemTotal = calculateItemTotal(item);
            const originalTotal = (item.product.base_price ?? 0) * item.quantity;
            const hasDiscount = item.discount && item.discount > 0;

            return (
              <Collapsible
                key={item.product.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(item.product.id)}
              >
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {item.product.name}
                        </h4>
                        {(hasOverride || hasDiscount) && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            Editado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-primary">
                          {formatPrice(itemTotal)}
                        </span>
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
                        onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
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
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
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
                        onClick={() => onRemoveItem(item.product.id)}
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
                          value={item.priceOverride ?? item.product.base_price ?? ""}
                          onChange={(e) =>
                            onUpdatePrice(
                              item.product.id,
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="h-8 text-sm"
                          placeholder={`${item.product.base_price ?? 0}`}
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
                          onChange={(e) =>
                            onUpdateDiscount(
                              item.product.id,
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {hasOverride && item.priceOverride !== item.product.base_price && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 text-xs"
                        onClick={() => onUpdatePrice(item.product.id, undefined)}
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
      </ScrollArea>

      {/* Totals */}
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
      </div>
    </Card>
  );
}
