import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, ArrowLeft, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SEARCH_HISTORY_KEY = "c2c-search-history";
const MAX_HISTORY = 10;

const TRENDING_SEARCHES = [
  "iPhone", "PlayStation", "Câmara", "Portátil", "Bicicleta",
  "Nike", "Samsung", "Monitor", "Consola", "Relógio",
];

interface MarketplaceSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  initialQuery?: string;
}

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = getHistory().filter((h) => h !== trimmed);
  history.unshift(trimmed);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function removeFromHistory(query: string) {
  const history = getHistory().filter((h) => h !== query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function clearHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export function MarketplaceSearchOverlay({
  open,
  onClose,
  onSearch,
  initialQuery = "",
}: MarketplaceSearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [isVisualLoading, setIsVisualLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setHistory(getHistory());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, initialQuery]);

  const handleSubmit = (value?: string) => {
    const q = (value ?? query).trim();
    if (!q) return;
    saveToHistory(q);
    onSearch(q);
    onClose();
  };

  const handleRemoveHistoryItem = (item: string) => {
    removeFromHistory(item);
    setHistory(getHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleVisualSearch = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 5MB)");
      return;
    }
    setIsVisualLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("store-visual-search", {
        body: { image: base64 },
      });
      if (error) throw error;
      if (data?.searchTerms) {
        setQuery(data.searchTerms);
        handleSubmit(data.searchTerms);
        toast.success("Pesquisa visual concluída!");
      } else {
        toast.error("Não foi possível analisar a imagem");
      }
    } catch {
      toast.error("Erro na pesquisa visual");
    } finally {
      setIsVisualLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Search header */}
          <div className="sticky top-0 bg-background border-b z-10">
            <div className="flex items-center gap-2 p-3">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <form
                className="flex-1 relative"
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar no marketplace..."
                  className="w-full h-11 pl-10 pr-10 rounded-full border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-colors"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVisualSearch(file);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0"
                disabled={isVisualLoading}
                onClick={() => fileRef.current?.click()}
                title="Pesquisar com imagem"
              >
                {isVisualLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-primary font-medium"
                onClick={() => handleSubmit()}
              >
                Pesquisar
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4 space-y-6" style={{ maxHeight: "calc(100vh - 70px)" }}>
            {/* Recent searches */}
            {history.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Pesquisas recentes
                  </h3>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpar tudo
                  </button>
                </div>
                <div className="space-y-0.5">
                  {history.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between group rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <button
                        className="flex items-center gap-3 flex-1 py-2.5 px-3 text-left"
                        onClick={() => {
                          setQuery(item);
                          handleSubmit(item);
                        }}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{item}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveHistoryItem(item)}
                        className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trending */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Em tendência
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      handleSubmit(term);
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-full text-sm border transition-colors",
                      "bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
