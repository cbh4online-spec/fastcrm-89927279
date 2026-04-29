import { memo } from "react";
import { Package, Edit3, Archive, Share2, Trash2, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import { haptics } from "@/hooks/useHaptics";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface MobileProductCardProps {
  product: Product;
  formatCurrency: (n: number) => string;
  getProductTypeLabel: (t: string) => string;
  onOpen: (p: Product) => void;
  onEdit: (p: Product) => void;
  onArchive: (p: Product) => void;
  onDelete: (p: Product) => void;
  onShare?: (p: Product) => void;
}

function getThumbnail(p: Product): string | null {
  const imgs = (p as any).images as string[] | undefined;
  if (Array.isArray(imgs) && imgs.length) {
    const idx = (p as any).primary_image_index ?? 0;
    return imgs[idx] || imgs[0] || null;
  }
  return null;
}

function MobileProductCardImpl({
  product, formatCurrency, getProductTypeLabel,
  onOpen, onEdit, onArchive, onDelete, onShare,
}: MobileProductCardProps) {
  const thumb = getThumbnail(product);
  const price = (product as any).base_price ?? 0;
  const stock = (product as any).total_units;
  const isArchived = (product as any).status === "archived";
  const storePublished = !!(product as any).store_published;

  const handleTap = () => {
    haptics.tap();
    onOpen(product);
  };

  return (
    <SwipeableListItem
      className="rounded-xl border border-border mb-2 shadow-sm"
      leftActions={[
        {
          id: "edit",
          label: "Editar",
          color: "primary",
          icon: <Edit3 className="h-4 w-4" />,
          onAction: () => onEdit(product),
        },
      ]}
      rightActions={[
        ...(onShare
          ? [{
              id: "share",
              label: "Partilhar",
              color: "default" as const,
              icon: <Share2 className="h-4 w-4" />,
              onAction: () => onShare(product),
            }]
          : []),
        {
          id: "archive",
          label: isArchived ? "Repor" : "Arquivar",
          color: "warning",
          icon: <Archive className="h-4 w-4" />,
          onAction: () => onArchive(product),
        },
        {
          id: "delete",
          label: "Eliminar",
          color: "destructive",
          icon: <Trash2 className="h-4 w-4" />,
          onAction: () => onDelete(product),
        },
      ]}
    >
      <button
        type="button"
        onClick={handleTap}
        className={cn(
          "w-full flex items-center gap-3 p-3 text-left",
          "active:bg-muted/40 transition-colors",
          isArchived && "opacity-60"
        )}
      >
        <div className="relative h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
          {thumb ? (
            <img
              src={thumb}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate flex-1">{product.name}</h3>
            <span className="text-sm font-bold tabular-nums shrink-0">
              {formatCurrency(price)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            {(product as any).sku && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {(product as any).sku}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
              <Package className="h-2.5 w-2.5 mr-0.5" />
              {getProductTypeLabel((product as any).product_type)}
            </Badge>
            {storePublished && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-green-500/40 text-green-600">
                Loja
              </Badge>
            )}
            {isArchived && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                Arquivado
              </Badge>
            )}
          </div>
          {typeof stock === "number" && (
            <div className="mt-1 text-xs text-muted-foreground">
              Stock:{" "}
              <span className={cn(
                "font-medium",
                stock <= 0 ? "text-destructive" : stock < 5 ? "text-amber-600" : "text-foreground"
              )}>
                {stock}
              </span>
            </div>
          )}
        </div>
      </button>
    </SwipeableListItem>
  );
}

export const MobileProductCard = memo(MobileProductCardImpl);
