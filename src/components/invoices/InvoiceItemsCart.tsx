import { Trash2, Plus, Minus, ShoppingCart, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { useState } from "react";
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

export interface InvoiceCartItem {
  id: string;
  product_id?: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

interface InvoiceItemsCartProps {
  items: InvoiceCartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateDiscount: (id: string, discount: number) => void;
  onUpdateTaxRate: (id: string, taxRate: number) => void;
  onRemoveItem: (id: string) => void;
  onClear: () => void;
}

export function InvoiceItemsCart({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onUpdateTaxRate,
  onRemoveItem,
  onClear,
}: InvoiceItemsCartProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const calculateItemTotal = (item: InvoiceCartItem) => {
    const discountMultiplier = 1 - item.discount_percent / 100;
    return item.quantity * item.unit_price * discountMultiplier;
  };

  const calculateItemTax = (item: InvoiceCartItem) => {
    return (calculateItemTotal(item) * item.tax_rate) / 100;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const taxAmount = items.reduce((sum, item) => sum + calculateItemTax(item), 0);
  const total = subtotal + taxAmount;

  if (items.length === 0) {
    return (
      <Card className="p-4 flex flex-col items-center justify-center text-center h-[200px]">
        <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="font-medium text-muted-foreground text-sm">Sem itens</p>
        <p className="text-xs text-muted-foreground/70">
          Clique nos produtos para adicionar
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-3 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            Itens ({items.length})
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive h-7 text-xs">
          Limpar
        </Button>
      </div>

      <Separator className="mb-2" />

      {/* Items List */}
      <ScrollArea className="flex-1 max-h-[250px] -mx-3 px-3">
        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const hasDiscount = item.discount_percent > 0;
            const itemTotal = calculateItemTotal(item);

            return (
              <Collapsible
                key={item.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(item.id)}
              >
                <Card className="p-2 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-xs truncate">
                          {item.name}
                        </h4>
                        {hasDiscount && (
                          <Badge variant="secondary" className="text-[9px] shrink-0">
                            -{item.discount_percent}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold text-primary">
                          {formatPrice(itemTotal)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({item.tax_rate}% IVA)
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="w-5 text-center text-xs font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          {isExpanded ? (
                            <ChevronUp className="h-2.5 w-2.5" />
                          ) : (
                            <Edit2 className="h-2.5 w-2.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">
                          Preço unit.
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            onUpdatePrice(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">
                          Desc. (%)
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) =>
                            onUpdateDiscount(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">
                          IVA (%)
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={item.tax_rate}
                          onChange={(e) =>
                            onUpdateTaxRate(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="mt-3 pt-3 border-t space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">IVA</span>
          <span className="font-medium">{formatPrice(taxAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="font-semibold text-sm">Total</span>
          <span className="font-bold text-primary">{formatPrice(total)}</span>
        </div>
      </div>
    </Card>
  );
}
