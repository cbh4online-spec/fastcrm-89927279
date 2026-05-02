import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Loader2, Package, Sparkles, AlertTriangle, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductSemanticSearch } from "@/hooks/client-portal/useProductSemanticSearch";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

interface SemanticSearchBarProps {
  workspaceId: string | undefined;
  onProductSelect?: (productId: string) => void;
  placeholder?: string;
  className?: string;
}

const MIN_QUERY_LENGTH = 2;

export function SemanticSearchBar({
  workspaceId,
  onProductSelect,
  placeholder = "Pesquisar produtos por sintomas, necessidades...",
  className,
}: SemanticSearchBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(inputValue, 350);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, loading, error, search, clearResults } =
    useProductSemanticSearch(workspaceId);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length >= MIN_QUERY_LENGTH) {
      search(q);
      setIsOpen(true);
    } else {
      clearResults();
      setIsOpen(false);
    }
  }, [debouncedQuery, search, clearResults]);

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

  const showDropdown = isOpen && inputValue.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            if (inputValue.trim().length >= MIN_QUERY_LENGTH) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
          aria-label="Pesquisa inteligente de produtos"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : inputValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-[60] max-h-[420px] overflow-y-auto shadow-xl border-border">
          {loading && (
            <div className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              A pesquisar produtos…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 flex items-start gap-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Pesquisa indisponível</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {error === "quota_exceeded"
                    ? "Limite de pesquisas inteligentes atingido neste plano."
                    : error}
                </p>
              </div>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 pb-2 flex items-center gap-1.5">
                <Search className="h-3 w-3" />
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((product) => {
                const imageUrl =
                  product.images?.[product.primary_image_index ?? 0] || null;
                const relevance = Math.round((product.similarity ?? 0) * 100);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
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
                          {Number(product.base_price || 0).toFixed(2)}€
                        </span>
                        {product.category && (
                          <span className="truncate">• {product.category}</span>
                        )}
                      </div>
                    </div>
                    {relevance > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex-shrink-0",
                          relevance >= 70
                            ? "bg-green-50 text-green-700 border-green-200"
                            : relevance >= 40
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-muted",
                        )}
                      >
                        {relevance}%
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para “{inputValue.trim()}”.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
