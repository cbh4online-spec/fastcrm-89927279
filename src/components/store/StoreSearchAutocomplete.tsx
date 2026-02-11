import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { useStoreProducts, type StoreProduct } from "@/hooks/useStoreProducts";
import { StoreVisualSearch } from "@/components/store/StoreVisualSearch";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

const HISTORY_KEY = "store-search-history";
const MAX_HISTORY = 5;
const MIN_CHARS = 2;

function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSearchHistory(term: string) {
  const history = getSearchHistory().filter((h) => h !== term);
  history.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

interface StoreSearchAutocompleteProps {
  workspaceSlug: string;
  onSearch: (query: string) => void;
  onClose: () => void;
}

export function StoreSearchAutocomplete({ workspaceSlug, onSearch, onClose }: StoreSearchAutocompleteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [history] = useState(getSearchHistory);

  const showSuggestions = debouncedQuery.length >= MIN_CHARS;

  const { data: suggestions = [] } = useStoreProducts({
    workspaceId: workspaceSlug,
    search: showSuggestions ? debouncedQuery : undefined,
  });

  const limitedSuggestions = suggestions.slice(0, 6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearchHistory(query.trim());
      onSearch(query.trim());
      setIsFocused(false);
    }
  };

  const handleSelectProduct = (product: StoreProduct) => {
    saveSearchHistory(product.name);
    setIsFocused(false);
    navigate(`/store/${workspaceSlug}/product/${product.id}`);
  };

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    onSearch(term);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("");
      onSearch("");
      onClose();
    }
  };

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = isFocused && (limitedSuggestions.length > 0 || (query.length < MIN_CHARS && history.length > 0));

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Pesquisar produtos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className="w-48 sm:w-72 h-9 pl-8"
            autoFocus
          />
        </div>
        <StoreVisualSearch
          onSearchTerms={(terms) => {
            setQuery(terms);
            onSearch(terms);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="h-9 w-9"
          onClick={() => {
            setQuery("");
            onSearch("");
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-8 mt-1 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* History */}
            {query.length < MIN_CHARS && history.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pesquisas recentes</p>
                {history.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSelectHistory(term)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Product suggestions */}
            {limitedSuggestions.length > 0 && (
              <div className="p-2">
                {limitedSuggestions.map((product) => {
                  const img = product.images?.[product.primary_image_index ?? 0] || product.images?.[0];
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full flex items-center gap-3 px-2 py-2 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      {img ? (
                        <img src={img} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">€{product.base_price.toFixed(2)} <StoreVatLabel /></p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
                {suggestions.length > 6 && (
                  <button
                    onClick={handleSubmit as any}
                    className="w-full text-center text-xs text-primary py-2 hover:underline"
                  >
                    Ver todos os {suggestions.length} resultados
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
