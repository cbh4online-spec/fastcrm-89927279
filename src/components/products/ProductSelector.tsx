import { useState } from "react";
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
import { Check, ChevronsUpDown, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";

interface ProductSelectorProps {
  value?: string;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSelector({
  value,
  onSelect,
  placeholder = "Selecionar produto...",
  disabled = false,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: products, isLoading } = useProducts({ status: "active" });

  const selectedProduct = products?.find((p) => p.id === value);

  const formatCurrency = (val: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(val);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <Package className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {formatCurrency(selectedProduct.base_price, selectedProduct.currency)}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
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
                  {products?.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.category || ""}`}
                      onSelect={() => {
                        onSelect(product.id === value ? null : product);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.category && (
                            <p className="text-xs text-muted-foreground">
                              {product.category}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(product.base_price, product.currency)}
                        </Badge>
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
  );
}
