import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { useProductImageSearch } from "@/hooks/partner/useProductImageSearch";
import { cn } from "@/lib/utils";

interface ProductImageSearchPopoverProps {
  productName: string;
  /** Estilo do botão sobreposto à imagem do card. */
  className?: string;
}

/**
 * Popover com pesquisa de imagens reais para um produto, por nome.
 * - On-demand: a pesquisa só dispara quando o popover abre.
 * - Mostra miniaturas + atribuição da fonte (link para a página original).
 */
export function ProductImageSearchPopover({
  productName,
  className,
}: ProductImageSearchPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isFetching } = useProductImageSearch(productName, open);

  const candidates = data?.candidates ?? [];
  const hasError = data?.success === false || !!data?.error;
  const showLoading = open && (isLoading || isFetching);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Pesquisar imagens"
          title="Pesquisar imagens deste produto"
          className={cn(
            "h-8 w-8 backdrop-blur bg-background/80 hover:bg-background shadow-sm",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Imagens encontradas</p>
            {showLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1" title={productName}>
            {productName}
          </p>

          {showLoading && candidates.length === 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          )}

          {!showLoading && hasError && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground py-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {data?.error ?? "Não foi possível pesquisar imagens. Verifica o conector Firecrawl em Connectors."}
              </span>
            </div>
          )}

          {!showLoading && !hasError && candidates.length === 0 && (
            <p className="text-xs text-muted-foreground py-3">
              Sem imagens encontradas para este produto.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {candidates.slice(0, 8).map((c, idx) => (
                <a
                  key={`${c.url}-${idx}`}
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-md border bg-muted"
                  title={c.source_title ?? c.source_url}
                >
                  <img
                    src={c.url}
                    alt={c.source_title ?? "Imagem do produto"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      // Esconde miniaturas que falharem a carregar (hot-link bloqueado, 404, etc.)
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-1 text-[10px] text-white">
                      <ExternalLink className="h-3 w-3" />
                      <span className="line-clamp-1">{new URL(c.source_url).hostname}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {candidates.length > 0 && (
            <p className="text-[10px] text-muted-foreground pt-1">
              Clica numa imagem para abrir a página de origem.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
