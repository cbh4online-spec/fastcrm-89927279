import { useState, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, Package, Loader2, TrendingUp, Percent, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import { calculateProductMargins, getMarginColor } from "@/types/product";

interface ProposalProductItemProps {
  product: Product | null;
  quantity: number;
  unitPrice: number;
  onProductSelect: (product: Product | null) => void;
  onQuantityChange: (qty: number) => void;
  onPriceChange: (price: number) => void;
  currency?: string;
}

export function ProposalProductItem({
  product,
  quantity,
  unitPrice,
  onProductSelect,
  onQuantityChange,
  onPriceChange,
  currency = "EUR",
}: ProposalProductItemProps) {
  const [open, setOpen] = useState(false);
  const { data: products, isLoading } = useProducts({ status: "active" });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  // Calculate real-time margins based on product cost and current price
  const margins = useMemo(() => {
    if (!product) return null;

    const cost = product.direct_cost ?? 0;
    const opCost = product.operational_cost ?? 0;
    const totalPrice = unitPrice * quantity;
    const totalCost = cost * quantity;
    const totalOpCost = opCost * quantity;

    const grossMargin = totalPrice - totalCost;
    const grossMarginPct = totalPrice > 0 ? (grossMargin / totalPrice) * 100 : 0;

    const contributionMargin = totalPrice - totalCost - totalOpCost;
    const contributionMarginPct = totalPrice > 0 ? (contributionMargin / totalPrice) * 100 : 0;

    const commission = product.commission_default
      ? totalPrice * (product.commission_default / 100)
      : 0;

    return {
      grossMargin,
      grossMarginPct,
      contributionMargin,
      contributionMarginPct,
      commission,
    };
  }, [product, unitPrice, quantity]);

  const handleProductSelect = (selectedProduct: Product) => {
    onProductSelect(selectedProduct);
    onPriceChange(selectedProduct.base_price);
    setOpen(false);
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Product Selector */}
      <div className="space-y-2">
        <Label>Produto</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {product ? (
                <div className="flex items-center gap-2 truncate">
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="truncate">{product.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Selecionar produto...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Pesquisar produtos..." />
              <CommandList>
                {isLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {products?.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.category || ""}`}
                          onSelect={() => handleProductSelect(p)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              product?.id === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{p.name}</p>
                              {p.category && (
                                <p className="text-xs text-muted-foreground">
                                  {p.category}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{formatCurrency(p.base_price)}</Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quantity and Price */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label>Preço Unitário</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-semibold">
            {formatCurrency(unitPrice * quantity)}
          </div>
        </div>
      </div>

      {/* Real-time Margins */}
      {product && margins && (product.direct_cost !== null || product.commission_default !== null) && (
        <TooltipProvider>
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Margens estimadas</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Calculadas com base nos custos registados no produto.
                    Editar o preço aqui não altera o produto original.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {product.direct_cost !== null && (
                <div>
                  <p className="text-muted-foreground text-xs">Margem Bruta</p>
                  <p className={`font-semibold ${getMarginColor(margins.grossMarginPct)}`}>
                    {formatCurrency(margins.grossMargin)}
                    <span className="text-xs ml-1">({margins.grossMarginPct.toFixed(0)}%)</span>
                  </p>
                </div>
              )}

              {product.operational_cost !== null && product.operational_cost > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Margem Contrib.</p>
                  <p className={`font-semibold ${getMarginColor(margins.contributionMarginPct)}`}>
                    {formatCurrency(margins.contributionMargin)}
                    <span className="text-xs ml-1">({margins.contributionMarginPct.toFixed(0)}%)</span>
                  </p>
                </div>
              )}

              {product.commission_default !== null && (
                <div>
                  <p className="text-muted-foreground text-xs">
                    Comissão ({product.commission_default}%)
                  </p>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(margins.commission)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Alert if price differs from base */}
      {product && unitPrice !== product.base_price && (
        <p className="text-xs text-muted-foreground">
          ⓘ Preço ajustado para esta proposta. O produto original mantém {formatCurrency(product.base_price)}.
        </p>
      )}
    </Card>
  );
}
