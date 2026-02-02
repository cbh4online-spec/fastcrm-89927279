import * as React from "react";
import { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  quantity?: number;
  onClick: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

// Icon mapping for dynamic product types
const iconMap: Record<string, React.ElementType> = {
  Package: LucideIcons.Package,
  Repeat: LucideIcons.Repeat,
  Clock: LucideIcons.Clock,
  Layers: LucideIcons.Layers,
  GraduationCap: LucideIcons.GraduationCap,
  Boxes: LucideIcons.Boxes,
  Box: LucideIcons.Box,
  Briefcase: LucideIcons.Briefcase,
  Cloud: LucideIcons.Cloud,
  FileText: LucideIcons.FileText,
  RefreshCw: LucideIcons.RefreshCw,
  Key: LucideIcons.Key,
  Users: LucideIcons.Users,
  Wrench: LucideIcons.Wrench,
  BookOpen: LucideIcons.BookOpen,
};

// Dynamic color classes based on product type
const productTypeColors: Record<string, string> = {
  simple: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  recurring: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  sessions: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  composite: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  formacao: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  programa: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  physical: "bg-red-500/10 text-red-600 dark:text-red-400",
  service: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  saas: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  digital: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  subscription: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  license: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  consulting: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  maintenance: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
};

// Icon names per product type (from database defaults)
const productTypeIcons: Record<string, string> = {
  simple: "Package",
  recurring: "Repeat",
  sessions: "Clock",
  composite: "Layers",
  formacao: "GraduationCap",
  programa: "Boxes",
  physical: "Box",
  service: "Briefcase",
  saas: "Cloud",
  digital: "FileText",
  subscription: "RefreshCw",
  license: "Key",
  consulting: "Users",
  maintenance: "Wrench",
};

function getIcon(productType: string): React.ElementType {
  const iconName = productTypeIcons[productType];
  return iconMap[iconName] || Package;
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, isSelected, quantity = 0, onClick, onIncrement, onDecrement }, ref) => {
    const [zoomOpen, setZoomOpen] = useState(false);
    
    const Icon = getIcon(product.product_type);
    const colorClass = productTypeColors[product.product_type] || "bg-muted text-muted-foreground";

    // Get primary image URL
    const primaryImageUrl = product.images?.length > 0
      ? product.images[product.primary_image_index ?? 0]
      : null;

    const formatPrice = (price: number | null) => {
      if (!price) return "Sob consulta";
      return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: product.currency || "EUR",
      }).format(price);
    };

    // Thumbnail component
    const ImageThumbnail = () => (
      <div 
        className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-zoom-in border border-border/50"
        onClick={(e) => {
          e.stopPropagation();
          setZoomOpen(true);
        }}
      >
        {primaryImageUrl ? (
          <img
            src={primaryImageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    );

    return (
      <>
        {/* Dialog for click zoom */}
        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="max-w-md p-2">
            <AspectRatio ratio={4/3}>
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </AspectRatio>
            <p className="text-center font-medium mt-2">{product.name}</p>
            {product.sku && (
              <p className="text-xs text-muted-foreground text-center">SKU: {product.sku}</p>
            )}
          </DialogContent>
        </Dialog>

        <Card
          ref={ref}
          onClick={onClick}
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 relative group",
            isSelected && "ring-2 ring-primary border-primary bg-primary/5"
          )}
        >
          {isSelected && (
            <div className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-bold">
                {quantity > 0 ? quantity : "✓"}
              </span>
            </div>
          )}
          
          <div className="flex gap-3">
            {/* Image with HoverCard for desktop preview */}
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div>
                  <ImageThumbnail />
                </div>
              </HoverCardTrigger>
              <HoverCardContent 
                side="right" 
                className="w-64 p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AspectRatio ratio={4/3}>
                  {primaryImageUrl ? (
                    <img
                      src={primaryImageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-2">Sem imagem</span>
                    </div>
                  )}
                </AspectRatio>
                <p className="text-sm font-medium text-center mt-2">{product.name}</p>
                {product.sku && (
                  <p className="text-xs text-muted-foreground text-center">SKU: {product.sku}</p>
                )}
              </HoverCardContent>
            </HoverCard>

            {/* Product info */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Type icon and category */}
              <div className="flex items-start justify-between mb-1">
                <div className={cn("p-1 rounded", colorClass)}>
                  <Icon className="h-3 w-3" />
                </div>
                {product.category && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {product.category}
                  </Badge>
                )}
              </div>

              {/* Name */}
              <h4 className="font-medium text-sm line-clamp-2 flex-1">
                {product.name}
              </h4>

              {/* Price */}
              <div className="flex items-baseline justify-between mt-auto">
                <span className="text-sm font-bold text-primary">
                  {formatPrice(product.base_price)}
                </span>
                {product.billing_type === "recurring" && (
                  <span className="text-[10px] text-muted-foreground">/mês</span>
                )}
              </div>

              {/* Margin indicator */}
              {product.target_margin_pct && (
                <div className="text-[10px] text-muted-foreground">
                  Margem: {product.target_margin_pct}%
                </div>
              )}
            </div>
          </div>

          {/* Quantity controls when selected */}
          {isSelected && (
            <div 
              className="flex items-center justify-center gap-1 mt-2 pt-2 border-t"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement?.();
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncrement?.();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </>
    );
  }
);
ProductCard.displayName = "ProductCard";

export { ProductCard };
