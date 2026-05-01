import { useMemo, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLookbookTemplate } from "./templates";
import { getLookbookTheme, lookbookThemeStyle } from "./themes";
import type { PartnerCatalogPageWithItems, PartnerCatalogPageItem } from "@/types/partnerCatalog";

interface LookbookRendererProps {
  pages: PartnerCatalogPageWithItems[];
  onAddToCart: (item: PartnerCatalogPageItem) => void;
  /** Mostra link para o catálogo grid clássico */
  gridFallbackUrl?: string;
}

export function LookbookRenderer({ pages, onAddToCart, gridFallbackUrl }: LookbookRendererProps) {
  const [index, setIndex] = useState(0);

  // Reset index se número de páginas mudar
  useEffect(() => {
    if (index >= pages.length) setIndex(0);
  }, [pages.length, index]);

  const total = pages.length;
  const current = pages[index];

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const theme = useMemo(
    () => getLookbookTheme(current?.theme_key),
    [current?.theme_key]
  );

  if (!current) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Sem páginas para mostrar.</p>
      </div>
    );
  }

  const Template = getLookbookTemplate(current.template_key).Component;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm border"
      style={{
        ...lookbookThemeStyle(theme),
        backgroundColor: current.background_color || `hsl(var(--lb-bg))`,
        borderColor: `hsl(var(--lb-divider) / 0.4)`,
      }}
    >
      {/* Header minimal — paginador + acções */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: `hsl(var(--lb-divider) / 0.3)` }}
      >
        <span className="text-xs uppercase tracking-[0.25em] font-medium text-[hsl(var(--lb-ink))]">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-2">
          {gridFallbackUrl && (
            <Button asChild variant="ghost" size="sm" className="text-[hsl(var(--lb-ink))] hover:bg-[hsl(var(--lb-ink))]/5">
              <Link to={gridFallbackUrl}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Vista grelha
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo do template */}
      <div className="relative">
        <Template page={current} onAddToCart={onAddToCart} />

        {/* Setas de navegação */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Página anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[hsl(var(--lb-cta))] text-[hsl(var(--lb-cta-fg))] flex items-center justify-center shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              disabled={index === total - 1}
              aria-label="Página seguinte"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[hsl(var(--lb-cta))] text-[hsl(var(--lb-cta-fg))] flex items-center justify-center shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Footer com dots */}
      {total > 1 && (
        <div
          className="flex items-center justify-center gap-2 py-4 border-t"
          style={{ borderColor: `hsl(var(--lb-divider) / 0.3)` }}
        >
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir para página ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-8 bg-[hsl(var(--lb-ink))]"
                  : "w-1.5 bg-[hsl(var(--lb-ink))]/30 hover:bg-[hsl(var(--lb-ink))]/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
