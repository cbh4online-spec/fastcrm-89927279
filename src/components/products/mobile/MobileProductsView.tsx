import { useState, useMemo, useRef } from "react";
import { Search, X, Plus, ScanLine, SlidersHorizontal, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { MobileProductCard } from "./MobileProductCard";
import { haptics } from "@/hooks/useHaptics";
import type { Product } from "@/types/product";

interface MobileProductsViewProps {
  products: Product[];
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (v: string) => void;
  formatCurrency: (n: number) => string;
  getProductTypeLabel: (t: string) => string;
  onOpenProduct: (p: Product) => void;
  onEditProduct: (p: Product) => void;
  onArchiveProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
  onCreate: () => void;
  onScan: () => void;
  onRefresh: () => Promise<unknown> | void;
  totalCount: number;
}

type QuickFilterId = "all" | "active" | "archived" | "no_stock" | "low_stock" | "store" | "no_image" | "no_price";

const QUICK_FILTERS: { id: QuickFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "store", label: "Na loja" },
  { id: "low_stock", label: "Stock baixo" },
  { id: "no_stock", label: "Sem stock" },
  { id: "no_image", label: "Sem imagem" },
  { id: "no_price", label: "Sem preço" },
  { id: "archived", label: "Arquivados" },
];

export function MobileProductsView(props: MobileProductsViewProps) {
  const {
    products, isLoading, searchValue, onSearchChange,
    formatCurrency, getProductTypeLabel,
    onOpenProduct, onEditProduct, onArchiveProduct, onDeleteProduct,
    onCreate, onScan, onRefresh, totalCount,
  } = props;

  const [searchOpen, setSearchOpen] = useState(false);
  const [activeQuick, setActiveQuick] = useState<QuickFilterId>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      switch (activeQuick) {
        case "active": return p.status !== "archived";
        case "archived": return p.status === "archived";
        case "store": return !!p.store_published;
        case "no_stock": return typeof p.total_units === "number" && p.total_units <= 0;
        case "low_stock": return typeof p.total_units === "number" && p.total_units > 0 && p.total_units < 5;
        case "no_image": return !Array.isArray(p.images) || p.images.length === 0;
        case "no_price": return !p.base_price || Number(p.base_price) <= 0;
        default: return true;
      }
    });
  }, [products, activeQuick]);

  const handleShare = async (p: Product) => {
    haptics.tap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: p.name,
          text: `${p.name} — ${formatCurrency((p as any).base_price ?? 0)}`,
        });
      } catch {/* user cancel */}
    }
  };

  return (
    <div className="md:hidden flex flex-col h-full -m-3 sm:-m-4">
      <MobilePageHeader
        title="Produtos"
        subtitle={`${totalCount} ${totalCount === 1 ? "produto" : "produtos"}`}
        right={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Pesquisar"
              className="h-10 w-10"
              onClick={() => {
                haptics.tap();
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Scan código"
              className="h-10 w-10"
              onClick={() => { haptics.tap(); onScan(); }}
            >
              <ScanLine className="h-5 w-5" />
            </Button>
          </>
        }
      />

      {/* Quick filter chips */}
      <ScrollArea className="w-full shrink-0 border-b border-border bg-background">
        <div className="flex gap-2 px-3 py-2">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { haptics.tap(); setActiveQuick(f.id); }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                activeQuick === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      {/* Search field, only when active */}
      {searchValue && !searchOpen && (
        <div className="px-3 py-2 bg-muted/30 flex items-center gap-2 text-xs border-b border-border">
          <SlidersHorizontal className="h-3 w-3" />
          <span>Pesquisa: <strong>{searchValue}</strong></span>
          <button
            onClick={() => onSearchChange("")}
            className="ml-auto text-muted-foreground"
            aria-label="Limpar pesquisa"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* List with pull-to-refresh */}
      <PullToRefresh onRefresh={onRefresh} className="flex-1">
        <div className="px-3 py-3 pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">A carregar produtos…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">Sem produtos</h3>
              <p className="text-sm text-muted-foreground">
                {searchValue || activeQuick !== "all"
                  ? "Nenhum produto corresponde aos filtros."
                  : "Comece por criar o seu primeiro produto."}
              </p>
              {(!searchValue && activeQuick === "all") && (
                <Button onClick={onCreate} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />Criar produto
                </Button>
              )}
            </div>
          ) : (
            filtered.map((p) => (
              <MobileProductCard
                key={p.id}
                product={p}
                formatCurrency={formatCurrency}
                getProductTypeLabel={getProductTypeLabel}
                onOpen={onOpenProduct}
                onEdit={onEditProduct}
                onArchive={onArchiveProduct}
                onDelete={onDeleteProduct}
                onShare={handleShare}
              />
            ))
          )}
        </div>
      </PullToRefresh>

      {/* FAB criar */}
      <Button
        type="button"
        onClick={() => { haptics.tap(); onCreate(); }}
        aria-label="Criar produto"
        className={cn(
          "fixed right-4 z-40 h-14 w-14 rounded-full shadow-lg",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        )}
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Pesquisa fullscreen */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent
          side="top"
          className="h-full w-full p-0 border-0 safe-area-pt"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Pesquisar produtos</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(false)}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Pesquisar por nome, SKU…"
                className="pl-9 h-11"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-auto h-[calc(100%-64px)] px-3 py-2">
            {filtered.slice(0, 50).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  onOpenProduct(p);
                }}
                className="w-full flex items-center gap-3 px-2 py-3 border-b border-border text-left active:bg-muted"
              >
                <div className="h-10 w-10 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                  {Array.isArray((p as any).images) && (p as any).images[0]
                    ? <img src={(p as any).images[0]} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  {(p as any).sku && (
                    <div className="text-xs text-muted-foreground truncate">{(p as any).sku}</div>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency((p as any).base_price ?? 0)}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Sem resultados
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
