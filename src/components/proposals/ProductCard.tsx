import { Package, BookOpen, Users, Briefcase, Wrench, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onClick: () => void;
}

const productTypeIcons: Record<string, React.ElementType> = {
  service: Briefcase,
  training: BookOpen,
  program: Users,
  physical: Package,
  digital: Layers,
  consulting: Wrench,
};

const productTypeColors: Record<string, string> = {
  service: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  training: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  program: "bg-green-500/10 text-green-600 dark:text-green-400",
  physical: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  digital: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  consulting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function ProductCard({ product, isSelected, onClick }: ProductCardProps) {
  const Icon = productTypeIcons[product.product_type] || Package;
  const colorClass = productTypeColors[product.product_type] || "bg-muted text-muted-foreground";

  const formatPrice = (price: number | null) => {
    if (!price) return "Sob consulta";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: product.currency || "EUR",
    }).format(price);
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 relative group",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">✓</span>
        </div>
      )}
      
      <div className="flex flex-col h-full gap-2">
        {/* Icon and Type */}
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg", colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          {product.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
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
          <span className="text-lg font-bold text-primary">
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
    </Card>
  );
}
