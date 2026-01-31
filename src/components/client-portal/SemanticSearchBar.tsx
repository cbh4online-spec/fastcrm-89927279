import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductSemanticSearch } from "@/hooks/client-portal/useProductSemanticSearch";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SemanticSearchBarProps {
  workspaceId: string | undefined;
  onProductSelect?: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

export function SemanticSearchBar({
  workspaceId,
  onProductSelect,
  placeholder = "Pesquisar produtos por sintomas, necessidades...",
  className,
}: SemanticSearchBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(inputValue, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, loading, search, clearResults } = useProductSemanticSearch(workspaceId);

  // Trigger search on debounced query change
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      search(debouncedQuery);
      setIsOpen(true);
    } else {
      clearResults();
      setIsOpen(false);
    }
  }, [debouncedQuery, search, clearResults]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductClick = (productId: string) => {
    onProductSelect?.(productId);
    setIsOpen(false);
    setInputValue("");
    clearResults();
  };

  const handleClear = () => {
    setInputValue("");
    clearResults();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : inputValue ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[400px] overflow-y-auto shadow-lg">
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 pb-2">
              {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((product) => {
              const imageUrl = product.images?.[product.primary_image_index ?? 0] || null;
              const relevance = Math.round(product.similarity * 100);

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">
                        {product.base_price.toFixed(2)}€
                      </span>
                      {product.category && (
                        <span className="truncate">• {product.category}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "flex-shrink-0",
                      relevance >= 70 ? "bg-green-50 text-green-700 border-green-200" :
                      relevance >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-muted"
                    )}
                  >
                    {relevance}%
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* No Results */}
      {isOpen && !loading && inputValue.length >= 3 && results.length === 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 p-4 text-center">
          <p className="text-muted-foreground">
            Nenhum produto encontrado para "{inputValue}"
          </p>
        </Card>
      )}
    </div>
  );
}
